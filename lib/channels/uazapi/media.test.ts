import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn(), safe: vi.fn() }));
vi.mock("./client", () => ({ instanceRequest: mocks.request }));
vi.mock("@/lib/messaging/media/url-de-midia-externa", () => ({
  assertUrlDeMidiaSegura: mocks.safe,
}));
import { downloadInstanceMedia } from "./media";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
it("baixa áudio sem IA e sem transmitir token ao CDN", async () => {
  mocks.request.mockResolvedValue({ fileURL: "https://cdn.example/a.mp3", mimetype: "audio/mpeg" });
  const fetch = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
  vi.stubGlobal("fetch", fetch);
  const result = await downloadInstanceMedia("WA-ID", "audio");
  expect(mocks.request).toHaveBeenCalledWith(
    "/message/download",
    {
      id: "WA-ID",
      return_base64: false,
      generate_mp3: true,
      transcribe: false,
      download_quoted: false,
    },
    30000,
  );
  expect(result.mime).toBe("audio/mpeg");
  expect(result.buffer.length).toBe(3);
  expect(mocks.safe).toHaveBeenCalledWith("https://cdn.example/a.mp3");
  expect(fetch.mock.calls[0]![1]).toMatchObject({ redirect: "error" });
  expect(fetch.mock.calls[0]![1].headers).toBeUndefined();
});
it("recusa MIME incompatível sem baixar", async () => {
  mocks.request.mockResolvedValue({ fileURL: "https://cdn.example/a", mimetype: "text/html" });
  vi.stubGlobal("fetch", vi.fn());
  await expect(downloadInstanceMedia("ID", "image")).rejects.toThrow("type_mismatch");
  expect(fetch).not.toHaveBeenCalled();
});
it("recusa destino inseguro e tamanho acima do limite", async () => {
  mocks.request.mockResolvedValue({ fileURL: "http://127.0.0.1/a", mimetype: "image/png" });
  mocks.safe.mockRejectedValueOnce(new Error("unsafe_url"));
  await expect(downloadInstanceMedia("ID", "image")).rejects.toThrow("unsafe_url");
  mocks.safe.mockResolvedValue(undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("large", { headers: { "content-length": "52428801" } })),
  );
  await expect(downloadInstanceMedia("ID", "image")).rejects.toThrow("exceeds");
});
