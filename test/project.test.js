const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("PWA assets remain deployable from a GitHub Pages subpath", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.ok(manifest.icons.every((icon) => icon.src.startsWith("./")));

  for (const file of ["index.html", "vr.html"]) {
    const html = fs.readFileSync(file, "utf8");
    assert.match(html, /serviceWorker\.register\(["']\.\/sw\.js["']\)/);
    assert.doesNotMatch(html, /(?:href|src)=["']\/(?:manifest|pwa-icons|index|vr|sw)/);
  }
});

test("security-sensitive implementation regressions stay absent", () => {
  const html = fs.readFileSync("index.html", "utf8") + fs.readFileSync("vr.html", "utf8");
  assert.doesNotMatch(html, /localStorage\.setItem\(["']ma_remember_pass/);
  assert.doesNotMatch(html, /SUPER_ADMIN_EMAIL/);
  assert.doesNotMatch(html, /readAsDataURL\(/);
  assert.match(html, /isAdminUser\(/);
});

test("database migration covers tables and both media buckets", () => {
  const sql = fs.readFileSync("supabase/migrations/20260906000000_secure_public_data.sql", "utf8");
  for (const resource of ["missionary_points", "vr_works", "vr_scenes", "vr_hotspots", "history-media", "vr-media"]) {
    assert.ok(sql.includes(resource), `missing security policy for ${resource}`);
  }
  assert.match(sql, /enable row level security/);
  assert.match(sql, /app_metadata/);
});
