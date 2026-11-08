import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("carrega a configuração de produção sem Redis", async () => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PHASE", undefined);
  vi.stubEnv("WHATSAPP_PROVIDER", "uazapi");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://teste.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-teste");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-teste");
  vi.stubEnv("SUPABASE_DB_URL", "postgresql://usuario:senha@localhost:5432/postgres");
  vi.stubEnv("INTERNAL_SECRET", "segredo-teste");
  vi.stubEnv("CPF_ENCRYPTION_KEY", "cpf-teste");
  vi.stubEnv("AI_CRED_AES_KEY", "ia-teste");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);

  const { env } = await import("@/lib/env");

  expect(env.UPSTASH_REDIS_REST_URL).toBe("");
  expect(env.UPSTASH_REDIS_REST_TOKEN).toBe("");
});
