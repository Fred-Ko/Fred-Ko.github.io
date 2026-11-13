import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',timeout:30000,fullyParallel:false,workers:3,retries:0,
 reporter:'list',
 use:{serviceWorkers:'block',baseURL:'http://127.0.0.1:4410',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'firefox',use:{browserName:'firefox'}},{name:'webkit',use:{browserName:'webkit'}}],
 webServer:{command:'PORT=4410 node scripts/preview.ts',url:'http://127.0.0.1:4410',reuseExistingServer:!process.env.CI},
});
