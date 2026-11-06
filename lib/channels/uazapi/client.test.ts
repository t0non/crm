import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canonicalMessageId,
  connectInstance,
  instanceCredentials,
  instanceRequest,
  parseInstance,
  readInstance,
  sentMessageSchema,
  parseWebhookDestinations,
} from "./client";
import { normalizedTextMessage, validInstanceToken } from "./webhook";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const configure = () => {
  vi.stubEnv("UAZAPI_SERVER_URL", "https://instance.example");
  vi.stubEnv("UAZAPI_INSTANCE_TOKEN", "unit-test-instance-token");
};
const remote = (state: string) => ({
  instance: { id: "opaque-instance-id", status: state, token: "must-not-leak" },
});
describe("contrato UAZAPI", () => {
  it("aceita ausência real de webhooks sem descartar respostas inesperadas", () => {
    expect(parseWebhookDestinations(null)).toEqual([]);
    expect(
      parseWebhookDestinations([
        { id: "opaque", url: "https://example.com/hook", token: "must-not-leak" },
      ]),
    ).toEqual([{ id: "opaque", url: "https://example.com/hook" }]);
    expect(() => parseWebhookDestinations({ error: "unexpected" })).toThrow();
  });
  it.each([
    ["connected", "WORKING"],
    ["connecting", "SCAN_QR_CODE"],
    ["disconnected", "STOPPED"],
    ["hibernated", "STOPPED"],
  ])("traduz %s", (state, expected) => {
    const parsed = parseInstance(remote(state));
    expect(parsed.status).toBe(expected);
    expect(JSON.stringify(parsed)).not.toContain("must-not-leak");
  });
  it("não presume conectado em payload desconhecido", () => {
    expect(() => parseInstance({ connected: true })).toThrow();
    expect(() => parseInstance(remote("unknown"))).toThrow();
  });
  it("recusa URL com credencial, caminho, query ou HTTP", () => {
    configure();
    for (const url of [
      "http://instance.example",
      "https://user:pass@instance.example",
      "https://instance.example/api",
      "https://instance.example/?token=secret",
    ]) {
      vi.stubEnv("UAZAPI_SERVER_URL", url);
      expect(instanceCredentials()).toBeNull();
    }
  });
  it("envia token somente em header e não segue redirecionamento", async () => {
    configure();
    const fetch = vi.fn().mockResolvedValue(Response.json(remote("disconnected")));
    vi.stubGlobal("fetch", fetch);
    await readInstance();
    expect(fetch).toHaveBeenCalledWith(
      "https://instance.example/instance/status",
      expect.objectContaining({
        headers: { token: "unit-test-instance-token", "Content-Type": "application/json" },
        redirect: "error",
        cache: "no-store",
      }),
    );
  });
  it("erro HTTP não expõe corpo remoto", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("must-not-leak", { status: 401 })),
    );
    await expect(instanceRequest("/instance/status")).rejects.toThrow(/^uazapi_http_401$/);
  });
  it("não reinicia pareamento já em andamento", async () => {
    configure();
    const fetch = vi.fn().mockResolvedValue(Response.json(remote("connecting")));
    vi.stubGlobal("fetch", fetch);
    await connectInstance();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("inicia QR sem phone e confirma por status", async () => {
    configure();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(remote("disconnected")))
      .mockResolvedValueOnce(Response.json({ response: "Connecting" }))
      .mockResolvedValueOnce(
        Response.json({ instance: { ...remote("connecting").instance, qrcode: "cXI=" } }),
      );
    vi.stubGlobal("fetch", fetch);
    expect((await connectInstance()).state).toBe("connecting");
    expect(fetch.mock.calls[1]).toEqual([
      "https://instance.example/instance/connect",
      expect.objectContaining({ method: "POST", body: "{}" }),
    ]);
  });
  it("exige ID para considerar envio aceito e normaliza ID local e WhatsApp", () => {
    expect(() => sentMessageSchema.parse({ response: { status: "success" } })).toThrow();
    expect(canonicalMessageId("5511999999999:ABC")).toBe(canonicalMessageId("ABC"));
    expect(canonicalMessageId(canonicalMessageId("ABC"))).toBe("uazapi:ABC");
  });
});

const message = {
  id: "5511999999999:ABC",
  messageid: "ABC",
  chatid: "5511888888888@s.whatsapp.net",
  fromMe: false,
  text: "Mensagem de teste unitário",
  messageTimestamp: 1788868800000,
  messageType: "Conversation",
};
describe("entrada autenticada e deduplicação", () => {
  it("recusa token ausente ou diferente", () => {
    configure();
    expect(validInstanceToken("wrong")).toBe(false);
    expect(validInstanceToken("unit-test-instance-token")).toBe(true);
    vi.stubEnv("UAZAPI_INSTANCE_TOKEN", "");
    expect(validInstanceToken("unit-test-instance-token")).toBe(false);
  });
  it("usa o mesmo ID de envio e recebimento e respeita milissegundos", () => {
    const m = normalizedTextMessage(message)!;
    expect(m.externalId).toBe(canonicalMessageId("ABC"));
    expect(m.at).toBe(new Date(message.messageTimestamp).toISOString());
  });
  it("não duplica eco API, mas aceita envio manual do celular", () => {
    expect(normalizedTextMessage({ ...message, fromMe: true, wasSentByApi: true })).toBeNull();
    expect(normalizedTextMessage({ ...message, fromMe: true, wasSentByApi: false })?.fromMe).toBe(
      true,
    );
  });
  it("não cria lead de grupo, status ou identidade opaca sem telefone", () => {
    for (const chatid of ["123@g.us", "status@broadcast", "123@lid"])
      expect(normalizedTextMessage({ ...message, chatid })).toBeNull();
  });
  it("não transforma mídia em texto nem aceita timestamps inválidos", () => {
    expect(
      normalizedTextMessage({ ...message, text: null, messageType: "ImageMessage" })?.kind,
    ).toBe("image");
    expect(
      normalizedTextMessage({ ...message, text: null, messageType: "AudioMessage" })?.kind,
    ).toBe("audio");
    expect(normalizedTextMessage({ ...message, messageType: "ReactionMessage" })).toBeNull();
    expect(() => normalizedTextMessage({ ...message, messageTimestamp: -1 })).toThrow();
  });
});
