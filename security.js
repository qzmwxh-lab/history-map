(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HistoryMapSecurity = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MEDIA_PROTOCOLS = new Set(["https:", "http:", "blob:"]);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function safeMediaUrl(value, baseUrl) {
    if (!value) return "";
    try {
      const url = new URL(String(value), baseUrl || "https://invalid.local/");
      return MEDIA_PROTOCOLS.has(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function isAdminUser(user, expectedRole) {
    if (!user) return false;
    const role = user.app_metadata && user.app_metadata.role;
    return role === (expectedRole || "admin");
  }

  function storagePathFromPublicUrl(value, bucket) {
    if (!value || !bucket) return "";
    try {
      const url = new URL(value);
      const marker = `/storage/v1/object/public/${bucket}/`;
      const index = url.pathname.indexOf(marker);
      return index < 0 ? "" : decodeURIComponent(url.pathname.slice(index + marker.length));
    } catch (_) {
      return "";
    }
  }

  return Object.freeze({ escapeHtml, safeMediaUrl, isAdminUser, storagePathFromPublicUrl });
});
