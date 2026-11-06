import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTarget } from "./founder-db.mjs";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://uofchiacoqlfbtnkzbqd.supabase.co",
  SUPABASE_DB_URL:
    "postgresql://postgres.uofchiacoqlfbtnkzbqd:synthetic-password@aws-0-us-east-2.pooler.supabase.com:5432/postgres",
};

test("aceita somente o projeto autorizado e recusa senha placeholder ou desvios de destino", () => {
  assert.equal(validateTarget(env), env.SUPABASE_DB_URL);
  for (const [from, to] of [
    ["synthetic-password", "[YOUR-PASSWORD]"],
    ["synthetic-password", ""],
    ["postgres.uofchiacoqlfbtnkzbqd", "postgres.otherproject"],
    ["5432", "6543"],
    ["aws-0-us-east-2", "aws-1-eu-west-1"],
    ["/postgres", "/anotherdb"],
  ])
    assert.throws(() =>
      validateTarget({ ...env, SUPABASE_DB_URL: env.SUPABASE_DB_URL.replace(from, to) }),
    );
  assert.throws(() =>
    validateTarget({ ...env, NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co" }),
  );
  assert.throws(() =>
    validateTarget({ ...env, SUPABASE_DB_URL: `${env.SUPABASE_DB_URL}?sslmode=disable` }),
  );
});
