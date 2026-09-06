import fs from "node:fs";

const htmlFiles = ["index.html", "vr.html", "admin.html", "reset-password.html"];
const javascriptFiles = ["app-config.js", "security.js", "sw.js", "admin.js", "password-recovery.js"];
let failed = false;

for (const file of htmlFiles) {
  const source = fs.readFileSync(file, "utf8");
  const staticMarkup = source.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, "");
  const ids = [...staticMarkup.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) {
    console.error(`${file}: duplicate ids: ${duplicates.join(", ")}`);
    failed = true;
  }

  const inlineScripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((script) => script.trim());
  for (const [index, script] of inlineScripts.entries()) {
    try {
      new Function(script);
    } catch (error) {
      console.error(`${file}: inline script ${index + 1}: ${error.message}`);
      failed = true;
    }
  }
}

for (const file of javascriptFiles) {
  try {
    new Function(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`${file}: ${error.message}`);
    failed = true;
  }
}

for (const file of ["manifest.json", "package.json", "package-lock.json"]) {
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`${file}: ${error.message}`);
    failed = true;
  }
}

const combinedHtml = htmlFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const forbiddenPatterns = [
  ["plaintext password persistence", /localStorage\.setItem\(['\"]ma_remember_pass/],
  ["client-side administrator email", /SUPER_ADMIN_EMAIL/],
  ["media encoded into database rows", /readAsDataURL\(/],
  ["root-scoped service worker registration", /serviceWorker\.register\(['\"]\/sw\.js/],
];
for (const [description, pattern] of forbiddenPatterns) {
  if (pattern.test(combinedHtml)) {
    console.error(`security regression: ${description}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("HTML identifiers and inline JavaScript passed static checks.");
