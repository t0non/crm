import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";

test("prepara ambiente desconectado, gera segredos distintos e preserva configuração existente", () => {
  const root = mkdtempSync(join(tmpdir(), "founder-local-"));
  try {
    mkdirSync(join(root, "scripts"));
    const script = join(root, "scripts/founder-local.mjs");
    copyFileSync(new URL("./founder-local.mjs", import.meta.url), script);
    const run = (command) => spawnSync(process.execPath, [script, command], { encoding: "utf8" });
    assert.equal(run("prepare").status, 0);
    const file = join(root, ".env.local");
    const text = readFileSync(file, "utf8");
    const env = parseEnv(text);
    assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, "");
    assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, "");
    assert.equal(env.APP_NAME, "FounderCRM");
    assert.equal(env.APP_ACCENT_HEX, "#2563eb");
    assert.match(env.INTERNAL_SECRET, /^[a-f0-9]{64}$/);
    assert.notEqual(env.INTERNAL_SECRET, env.CPF_ENCRYPTION_KEY);
    assert.equal(run("check").status, 1);
    writeFileSync(file, `${text}\n# configuração preservada\n`);
    assert.equal(run("prepare").status, 0);
    assert.equal(readFileSync(file, "utf8"), `${text}\n# configuração preservada\n`);
    assert.equal(run("unknown").status, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
