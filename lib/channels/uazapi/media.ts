import { z } from "zod";
import { assertUrlDeMidiaSegura } from "@/lib/messaging/media/url-de-midia-externa";
import {
  MAX_MEDIA_BYTES,
  MediaTooLargeError,
  type FetchedMedia,
} from "@/lib/messaging/media/types";
import { instanceRequest } from "./client";

/** Download por ID autenticado; nunca usa URLs ou credenciais do webhook. */
export async function downloadInstanceMedia(
  id: string,
  kind: "image" | "audio",
): Promise<FetchedMedia> {
  const data = z.object({ fileURL: z.url(), mimetype: z.string() }).parse(
    await instanceRequest(
      "/message/download",
      {
        id,
        return_base64: false,
        generate_mp3: true,
        transcribe: false,
        download_quoted: false,
      },
      30000,
    ),
  );
  const mime = data.mimetype.split(";")[0]!.trim().toLowerCase();
  if (!mime.startsWith(`${kind}/`)) throw new Error("uazapi_media_type_mismatch");
  await assertUrlDeMidiaSegura(data.fileURL);
  // CDN público recebe zero headers de autenticação. Redirects não atravessam a guarda SSRF.
  const response = await fetch(data.fileURL, {
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok || !response.body) throw new Error("uazapi_media_download_failed");
  if (Number(response.headers.get("content-length") || 0) > MAX_MEDIA_BYTES)
    throw new MediaTooLargeError();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MEDIA_BYTES) throw new MediaTooLargeError();
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  if (!size) throw new Error("uazapi_media_empty");
  return { buffer: Buffer.concat(chunks), mime };
}
