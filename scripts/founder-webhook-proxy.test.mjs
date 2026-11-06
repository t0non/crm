import { test } from "node:test";
import assert from "node:assert/strict";
import { webhookProxy } from "./founder-webhook-proxy.mjs";

test("proxy não encaminha login, administração, métodos ou caminhos derivados", async () => {
  const path = `/api/v1/webhooks/instance/${"a".repeat(64)}`;
  const server = webhookProxy(path);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const route of [
      "/",
      "/login",
      "/app",
      "/admin",
      "/api/v1/channel-sessions/instance",
      `${path}/extra`,
      `${path}?x=1`,
    ]) {
      const r = await fetch(`${base}${route}`, { method: "POST" });
      assert.equal(r.status, 404);
      await r.text();
    }
    const get = await fetch(`${base}${path}`);
    assert.equal(get.status, 404);
    await get.text();
    assert.throws(() => webhookProxy("/admin"));
    assert.throws(() => webhookProxy(path, "https://example.com"));
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
