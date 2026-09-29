import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',
 use:{baseURL:'http://127.0.0.1:4321'},
 webServer:{command:'CI=1 ASTRO_TELEMETRY_DISABLED=1 npm run dev && npx astro dev logs --follow',url:'http://127.0.0.1:4321',reuseExistingServer:!process.env.CI},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:900}}},{name:'mobile',use:{viewport:{width:390,height:844}}}]
});
