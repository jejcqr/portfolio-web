const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests",
  testMatch: "*.spec.js",
  use: {
    baseURL: "http://127.0.0.1:8080",
    // Permet d'utiliser un Chromium déjà installé (CHROMIUM_PATH=/chemin/vers/chrome).
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: "python3 -m http.server 8080 --bind 127.0.0.1",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: true,
  },
  projects: [
    { name: "ordinateur", use: devices["Desktop Chrome"] },
    { name: "mobile", use: devices["Pixel 7"] },
  ],
});
