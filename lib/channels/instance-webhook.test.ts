import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ archive: vi.fn(), close: vi.fn(), ingest: vi.fn() }));
vi.mock("./arquivo-de-webhook", () => ({
  abrirArquivoDoWebhook: mocks.archive,
  fecharArquivoDoWebhook: mocks.close,
}));
vi.mock("./uazapi/ingest", () => ({ ingestInstanceText: mocks.ingest }));
import { receiveInstanceWebhook, replayInstanceReceipts } from "./instance-webhook";
import { normalizedTextMessage } from "./uazapi/webhook";

const payload = {
  EventType: "messages",
  token: "unit-secret-token",
  BaseUrl: "https://untrusted.example",
  organization_id: "other-tenant",
  message: {
    id: "owner:ABC",
    messageid: "ABC",
    chatid: "5511888888888@s.whatsapp.net",
    fromMe: false,
    text: "Fixture unitária",
    messageTimestamp: 1788868800000,
    token: "nested-secret",
  },
};

it("recuperação usa received_at, a coluna real de ordenação dos recibos", async () => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    single: vi
      .fn()
      .mockResolvedValue({
        data: { id: "session", organization_id: "trusted-org", uazapi_instance_id: "instance" },
        error: null,
      }),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  for (const method of [query.select, query.eq, query.is, query.in, query.order])
    method.mockReturnValue(query);
  const admin = { from: vi.fn().mockReturnValue(query) };
  expect(await replayInstanceReceipts(admin as never, "trusted-org")).toEqual({ processed: 0 });
  expect(query.order).toHaveBeenCalledWith("received_at", { ascending: true });
  expect(query.eq).toHaveBeenCalledWith("organization_id", "trusted-org");
});
function db() {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: "session", organization_id: "trusted-org", uazapi_instance_id: "instance" },
      error: null,
    }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  return { from: vi.fn().mockReturnValue(query), query };
}
beforeEach(() => {
  vi.stubEnv("UAZAPI_SERVER_URL", "https://instance.example");
  vi.stubEnv("UAZAPI_INSTANCE_TOKEN", "unit-secret-token");
  mocks.archive.mockResolvedValue("receipt");
  mocks.close.mockResolvedValue(undefined);
  mocks.ingest.mockResolvedValue({ ingested: true });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
it("recusa token inválido antes de consultar ou arquivar", async () => {
  const admin = db();
  expect(
    await receiveInstanceWebhook(admin as never, "path", { ...payload, token: "wrong" }),
  ).toEqual({ accepted: false });
  expect(admin.from).not.toHaveBeenCalled();
  expect(mocks.archive).not.toHaveBeenCalled();
});
it("resolve organização pelo path e arquiva somente whitelist sem tokens", async () => {
  const admin = db();
  expect((await receiveInstanceWebhook(admin as never, "path", payload)).accepted).toBe(true);
  expect(admin.query.eq).toHaveBeenCalledWith("webhook_path_token", "path");
  expect(mocks.ingest).toHaveBeenCalledWith(
    admin,
    expect.objectContaining({ organization_id: "trusted-org" }),
    expect.anything(),
  );
  const input = mocks.archive.mock.calls[0]![1];
  expect(input.organizationId).toBe("trusted-org");
  expect(input.rawBody).not.toContain("unit-secret-token");
  expect(input.rawBody).not.toContain("nested-secret");
  expect(input.rawBody).not.toContain("other-tenant");
  expect(input.rawBody).not.toContain("untrusted.example");
  expect(mocks.close).toHaveBeenCalledWith(
    admin,
    "receipt",
    expect.objectContaining({ status: "processed" }),
  );
});
it("preserva recibo de falha para recuperação manual", async () => {
  const admin = db();
  mocks.ingest.mockRejectedValueOnce(new Error("failure"));
  await expect(receiveInstanceWebhook(admin as never, "path", payload)).rejects.toThrow(
    "instance_processing_failed",
  );
  expect(mocks.close).toHaveBeenCalledWith(
    admin,
    "receipt",
    expect.objectContaining({ status: "error" }),
  );
});
it("não processa mensagem se o recibo durável falhar", async () => {
  const admin = db();
  mocks.archive.mockResolvedValueOnce(null);
  await expect(receiveInstanceWebhook(admin as never, "path", payload)).rejects.toThrow(
    "durable_receipt_failed",
  );
  expect(mocks.ingest).not.toHaveBeenCalled();
});

it("preserva o ID documentado do botão mesmo quando não há texto", async () => {
  const message = {
    ...payload.message,
    messageType: "InteractiveResponseMessage",
    text: "",
    buttonOrListid: "santa_demo_horarios",
  };
  await receiveInstanceWebhook(db() as never, "path", { ...payload, message });
  const receipt = JSON.parse(mocks.archive.mock.calls[0]![1].rawBody);
  expect(normalizedTextMessage(receipt.message)).toMatchObject({
    kind: "text",
    buttonId: "santa_demo_horarios",
    text: "Selecionou uma opção do menu",
  });
  expect(receipt.message).not.toHaveProperty("token");
  expect(normalizedTextMessage({ ...message, fromMe: true, wasSentByApi: true })).toBeNull();
});
