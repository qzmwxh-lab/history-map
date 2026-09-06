const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeHtml, safeMediaUrl, isAdminUser, storagePathFromPublicUrl } = require("../security.js");

test("escapeHtml neutralizes markup and quoted attributes", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert('x')">`), "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;");
});

test("safeMediaUrl only accepts media-safe protocols", () => {
  assert.equal(safeMediaUrl("javascript:alert(1)"), "");
  assert.equal(safeMediaUrl("data:text/html,<script>alert(1)</script>"), "");
  assert.equal(safeMediaUrl("https://example.com/a.jpg"), "https://example.com/a.jpg");
});

test("admin access comes from server-managed app metadata", () => {
  assert.equal(isAdminUser({ email: "admin@example.com", app_metadata: {} }), false);
  assert.equal(isAdminUser({ app_metadata: { role: "admin" } }), true);
});

test("storagePathFromPublicUrl extracts only the selected bucket path", () => {
  const url = "https://demo.supabase.co/storage/v1/object/public/vr-media/image/a.jpg";
  assert.equal(storagePathFromPublicUrl(url, "vr-media"), "image/a.jpg");
  assert.equal(storagePathFromPublicUrl(url, "history-media"), "");
});
