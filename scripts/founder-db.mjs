import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";

const PROJECT = "uofchiacoqlfbtnkzbqd";

export function validateTarget(env) {
  const uri = new URL(env.SUPABASE_DB_URL || "invalid:");
  const app = new URL(env.NEXT_PUBLIC_SUPABASE_URL || "invalid:");
  if (
    app.origin !== `https://${PROJECT}.supabase.co` ||
    uri.protocol !== "postgresql:" ||
    uri.username !== `postgres.${PROJECT}` ||
    uri.hostname !== "aws-0-us-east-2.pooler.supabase.com" ||
    uri.port !== "5432" ||
    uri.pathname !== "/postgres" ||
    uri.search ||
    uri.hash
  )
    throw new Error(
      "Destino recusado: use o Session pooler do projeto de desenvolvimento autorizado.",
    );
  const password = decodeURIComponent(uri.password);
  if (!password || /YOUR-PASSWORD|SUA-SENHA/i.test(password)) {
    throw new Error("Configure a senha real do banco em SUPABASE_DB_URL no .env.local.");
  }
  return uri.toString();
}

async function main() {
  const env = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
  let connectionString;
  try {
    connectionString = validateTarget(env);
  } catch (error) {
    console.error(
      error instanceof TypeError ? "URI PostgreSQL inválida; confira o .env.local." : error.message,
    );
    process.exitCode = 1;
    return;
  }
  const mode = process.argv[2] || "check";
  if (!["check", "install"].includes(mode))
    throw new Error("Uso: node scripts/founder-db.mjs check|install");
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString,
    ssl: {
      rejectUnauthorized: true,
      ...(existsSync(new URL("../.runtime/certs/prod-ca-2021.crt", import.meta.url))
        ? {
            ca: readFileSync(
              new URL("../.runtime/certs/prod-ca-2021.crt", import.meta.url),
              "utf8",
            ),
          }
        : {}),
    },
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(703442610)");
    const { rows } = await client.query(`
      SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass
        AND d.objid=c.oid AND d.deptype='e')
    `);
    if (rows.length) throw new Error("not_empty");
    console.info("Conexão TLS e destino autorizados; schema public sem relações da aplicação.");
    if (mode === "install") {
      await client.query(
        "CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public; CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public; CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;",
      );
      const sql = readFileSync(new URL("../supabase/baseline.sql", import.meta.url), "utf8");
      // Execute o arquivo inteiro em ordem, preservando as definições finais dos apêndices.
      await client.query(sql);
      await client.query(
        "SELECT id FROM public.organizations LIMIT 0; SELECT id FROM public.crm_leads LIMIT 0; SELECT id FROM public.messages LIMIT 0;",
      );
      await client.query("COMMIT");
      console.info(
        "Baseline instalado e tabelas centrais verificadas. Bootstrap do usuário não executado.",
      );
    } else {
      await client.query("ROLLBACK");
      console.info("Verificação concluída; nenhuma alteração persistida.");
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(
      error.message === "not_empty"
        ? "Instalação recusada: schema public já contém relações. Nenhum baseline aplicado."
        : `Operação interrompida; transação revertida quando disponível. Código: ${error.code || "sem_codigo"}. Nenhuma credencial exibida.`,
    );
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error(
      "Preparação interrompida; confira o arquivo local e as dependências. Nenhuma credencial exibida.",
    );
    process.exitCode = 1;
  });
}
