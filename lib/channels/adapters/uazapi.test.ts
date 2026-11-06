import { afterEach, beforeEach, expect, it, vi } from "vitest";
const scope = vi.hoisted(() => vi.fn());
vi.mock("@/lib/messaging/media/url-de-midia-externa", () => ({ assertUrlDeMidiaSegura: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("../uazapi/session", () => ({ assertInstanceSession: scope }));
import { uazapiAdapter } from "./uazapi";
beforeEach(() => {
  vi.stubEnv("UAZAPI_SERVER_URL", "https://instance.example");
  vi.stubEnv("UAZAPI_INSTANCE_TOKEN", "unit-token");
  scope.mockResolvedValue({ id: "session" });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
const input = {
  organizationId: "org",
  sessionRef: "instance",
  to: "5511888888888",
  kind: "text" as const,
  body: "Fixture unitária",
};
it("confere organização, instância e beforeSend antes de enviar texto", async () => {
  const beforeSend = vi.fn().mockResolvedValue(undefined);
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ instance: { id: "instance", status: "connected" } }))
    .mockResolvedValueOnce(Response.json({ id: "owner:ABC", messageid: "ABC" }));
  vi.stubGlobal("fetch", fetch);
  expect(await uazapiAdapter.send({ ...input, beforeSend })).toEqual({ externalId: "uazapi:ABC" });
  expect(scope).toHaveBeenCalledWith({}, "org", "instance");
  expect(beforeSend).toHaveBeenCalledOnce();
  expect(fetch.mock.calls[1]).toEqual([
    "https://instance.example/send/text",
    expect.objectContaining({ body: JSON.stringify({ number: input.to, text: input.body }) }),
  ]);
});
it("não envia para instância diferente e não faz retry automático", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ instance: { id: "other", status: "connected" } }));
  vi.stubGlobal("fetch", fetch);
  await expect(uazapiAdapter.send(input)).rejects.toThrow("uazapi_session_unavailable");
  expect(fetch).toHaveBeenCalledOnce();
});
it("recusa falta de autorização antes de qualquer chamada remota", async () => {
  scope.mockRejectedValueOnce(new Error("not_authorized"));
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(uazapiAdapter.send(input)).rejects.toThrow("not_authorized");
  expect(fetch).not.toHaveBeenCalled();
});
it.each([
  ["image", "image"],
  ["audio", "ptt"],
] as const)("envia %s pelo contrato de mídia", async (kind, type) => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ instance: { id: "instance", status: "connected" } }))
    .mockResolvedValueOnce(Response.json({ messageid: "MEDIA-ID" }));
  vi.stubGlobal("fetch", fetch);
  const beforeSend = vi.fn().mockResolvedValue(undefined);
  await expect(
    uazapiAdapter.send({
      ...input,
      kind,
      beforeSend,
      media: {
        url: "https://cdn.example/file",
        mime: kind === "audio" ? "audio/webm" : "image/jpeg",
        caption: "Legenda",
      },
    }),
  ).resolves.toEqual({ externalId: "uazapi:MEDIA-ID" });
  expect(beforeSend).toHaveBeenCalledOnce();
  expect(fetch.mock.calls[1]![0]).toBe("https://instance.example/send/media");
  expect(JSON.parse(fetch.mock.calls[1]![1].body)).toMatchObject({
    type,
    file: "https://cdn.example/file",
    number: input.to,
  });
});
