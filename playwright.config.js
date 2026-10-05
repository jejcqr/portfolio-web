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
    command: "npm start",
    url: "http://127.0.0.1:8080",
    // Jamais un serveur déjà lancé : il pourrait servir une autre version du site.
    // Si le port 8080 est occupé, Playwright s'arrête avec un message explicite.
    reuseExistingServer: false,
  },
  projects: [
    { name: "ordinateur", use: devices["Desktop Chrome"] },
    { name: "mobile", use: devices["Pixel 7"] },
  ],
});
