(function (root) {
  "use strict";

  root.APP_CONFIG = Object.freeze({
    supabaseUrl: "https://zjtofadvudkfijlpptmb.supabase.co",
    supabasePublishableKey: "sb_publishable_QM9V7Vr7MsnW4aqPj1GPGg_1iX6dyRb",
    adminRole: "admin",
    storage: Object.freeze({
      historyBucket: "history-media",
      vrBucket: "vr-media",
    }),
  });
})(typeof window !== "undefined" ? window : globalThis);
