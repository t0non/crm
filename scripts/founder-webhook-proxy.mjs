import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Um único caminho e método; nenhuma rota administrativa é encaminhada. */
export function webhookProxy(allowedPath, target = "http://127.0.0.1:3000") {
  if (!/^\/api\/v1\/webhooks\/instance\/[a-f0-9]{64}$/.test(allowedPath))
    throw new Error("Rota inválida");
  if (target !== "http://127.0.0.1:3000") throw new Error("Destino local inválido");
  return createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== allowedPath) {
      res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      res.end("Not found");
      return;
    }
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) {
          res.writeHead(413);
          res.end();
          return;
        }
        chunks.push(chunk);
      }
      const upstream = await fetch(`${target}${allowedPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: Buffer.concat(chunks),
        redirect: "error",
        signal: AbortSignal.timeout(90000),
      });
      res.writeHead(upstream.status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(await upstream.text());
    } catch {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end("Webhook temporarily unavailable");
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { path } = JSON.parse(
    readFileSync(new URL("../.runtime/instance-webhook.json", import.meta.url), "utf8"),
  );
  const server = webhookProxy(path);
  server.listen(3400, "127.0.0.1", () =>
    console.info("Proxy exclusivo do webhook em 127.0.0.1:3400."),
  );
  server.on("error", () => {
    console.error("Não foi possível iniciar o proxy do webhook.");
    process.exitCode = 1;
  });
}
