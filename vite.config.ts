import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';

// PW_CHANNEL=chrome を指定すると、Playwright 同梱ではなくインストール済みの Chrome でテストする
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(channel ? { launchOptions: { channel } } : {}),
      instances: [{ browser: 'chromium' }],
    },
  },
});
