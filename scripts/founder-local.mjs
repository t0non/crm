import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const file = resolve(root, ".env.local");
const command = process.argv[2] ?? "check";

if (command === "prepare") {
  if (existsSync(file)) {
    console.info(".env.local já existe; nenhum valor foi alterado.");
  } else {
    const secret = () => randomBytes(32).toString("hex");
    writeFileSync(
      file,
      `# FounderCRM — somente desenvolvimento, Supabase NOVO e isolado.
# Preencha os valores vazios. Não compartilhe este arquivo.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_NAME=FounderCRM
APP_LOCALE=pt-BR
APP_ACCENT_HEX="#2563eb"
INTERNAL_SECRET=${secret()}
CPF_ENCRYPTION_KEY=${secret()}
WAHA_BYO_ENCRYPTION_KEY=${secret()}
IMPERSONATE_COOKIE_SECRET=${secret()}
SENTRY_DSN=off
# Usados somente pelo bootstrap manual, após instalar o baseline.
OWNER_EMAIL=
OWNER_PASSWORD=
OWNER_ORG_NAME=FounderCRM
# WhatsApp e IA não configurados nesta etapa. Não iniciar workers/crons.
`,
      { flag: "wx", mode: 0o600 },
    );
    console.info(
      ".env.local criado com segredos locais aleatórios; Supabase permanece desconectado.",
    );
  }
} else if (command === "check") {
  const major = Number(process.versions.node.split(".")[0]);
  const env = existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missing = required.filter((key) => !env[key]?.trim());
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  let validUrl = false;
  try {
    validUrl = ["https:", "http:"].includes(new URL(url).protocol);
  } catch {
    /* diagnóstico abaixo */
  }
  const installed = existsSync(resolve(root, "node_modules/next/package.json"));
  console.info(`Node >=22: ${major >= 22 ? "OK" : "FALHOU"}`);
  console.info(`Dependências Next.js: ${installed ? "OK" : "ausentes — instale com pnpm 9.15.9"}`);
  console.info(
    `Configuração Supabase: ${missing.length ? `faltam ${missing.join(", ")}` : validUrl ? "preenchida (conexão não testada)" : "URL inválida"}`,
  );
  console.info(
    "Nenhuma conexão ou escrita no banco foi executada. Consulte docs/FOUNDERCRM-LOCAL.md.",
  );
  process.exitCode = major >= 22 && installed && !missing.length && validUrl ? 0 : 1;
} else {
  console.error("Uso: node scripts/founder-local.mjs prepare|check");
  process.exitCode = 1;
}
