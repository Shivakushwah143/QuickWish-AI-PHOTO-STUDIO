import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',use:{baseURL:process.env.E2E_URL||'http://localhost:5173'},workers:1});
