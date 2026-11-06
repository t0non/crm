import { z } from "zod";

export const INSTANCE_PROVIDER = "uazapi" as const;
export const INSTANCE_LABEL = "UAZAPI";
export const credentialsSchema = z.object({
  serverUrl: z.url().refine((v) => {
    const url = new URL(v);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
    );
  }, "Use a Server URL HTTPS, sem caminho ou credenciais."),
  token: z.string().trim().min(1),
});
export function instanceCredentials() {
  const result = credentialsSchema.safeParse({
    serverUrl: process.env.UAZAPI_SERVER_URL,
    token: process.env.UAZAPI_INSTANCE_TOKEN,
  });
  return result.success ? result.data : null;
}

export async function instanceRequest(
  path: string,
  body?: unknown,
  timeoutMs = 8000,
): Promise<unknown> {
  const creds = instanceCredentials();
  if (!creds) throw new Error("uazapi_not_configured");
  // O destino vem exclusivamente da configuração do operador no backend.
  const response = await fetch(`${new URL(creds.serverUrl).origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { token: creds.token, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  // Nunca inclua o corpo remoto no erro: pode conter token e chaves de outros serviços.
  if (!response.ok) throw new Error(`uazapi_http_${response.status}`);
  return response.json();
}

const instanceSchema = z.object({
  instance: z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    status: z.enum(["disconnected", "connecting", "connected", "hibernated"]),
    qrcode: z.string().nullish(),
    owner: z.string().nullish(),
  }),
});
export function parseInstance(raw: unknown) {
  const { instance } = instanceSchema.parse(raw);
  return {
    id: instance.id,
    name: instance.name ?? null,
    state: instance.status,
    status:
      instance.status === "connected"
        ? "WORKING"
        : instance.status === "connecting"
          ? "SCAN_QR_CODE"
          : "STOPPED",
    qr:
      instance.qrcode && /^(data:image\/png;base64,)?[A-Za-z0-9+/=\r\n]+$/.test(instance.qrcode)
        ? instance.qrcode.startsWith("data:")
          ? instance.qrcode
          : `data:image/png;base64,${instance.qrcode}`
        : null,
    phone:
      instance.owner && /^\d{10,15}(?:@s\.whatsapp\.net)?$/.test(instance.owner)
        ? `+${instance.owner.split("@")[0]}`
        : null,
  };
}
export async function readInstance() {
  return parseInstance(await instanceRequest("/instance/status"));
}
export async function connectInstance() {
  const current = await readInstance();
  if (current.state === "connected" || current.state === "connecting") return current;
  await instanceRequest("/instance/connect", {});
  // Retry até 3x para pegar o QR assim que o servidor gerar (normalmente < 2s)
  for (let i = 0; i < 3; i++) {
    const updated = await readInstance();
    if (updated.qr || updated.state === "connected") return updated;
    await new Promise((r) => setTimeout(r, 1200));
  }
  return readInstance();
}

export function canonicalMessageId(id: string): string {
  // id local = owner:WhatsAppID; messageid = WhatsAppID, conforme contrato.
  const bare = id.includes(":") ? id.slice(id.lastIndexOf(":") + 1) : id;
  return `uazapi:${bare}`;
}
export const sentMessageSchema = z
  .object({ id: z.string().optional(), messageid: z.string().optional() })
  .refine((v) => Boolean(v.messageid || v.id), "Resposta sem ID de mensagem");

export function parseWebhookDestinations(raw: unknown) {
  // Observado na instância real: null representa ausência de destinos.
  return z
    .array(
      z.object({
        id: z.string().min(1),
        url: z.url(),
        enabled: z.boolean().optional(),
        events: z.array(z.string()).optional(),
      }),
    )
    .parse(raw === null ? [] : raw);
}
