// Configuration plate d'ESLint : règles recommandées, un environnement par type de fichier.
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  {
    // Code de la page : navigateur, scripts classiques (pas de modules), jQuery global.
    files: ["js/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: { ...globals.browser, ...globals.jquery, Filtres: "readonly" },
    },
    rules: { eqeqeq: "error" },
  },
  {
    // filtres.js est aussi chargé par Node.js (module.exports) pour les tests.
    files: ["js/filtres.js"],
    languageOptions: { globals: { module: "readonly" } },
  },
  {
    // Tests et configuration : Node.js, CommonJS.
    files: ["tests/**/*.js", "*.config.js"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } },
    rules: { eqeqeq: "error" },
  },
  {
    // Les fonctions passées à page.evaluate() ou addInitScript() s'exécutent dans la page.
    files: ["tests/**/*.spec.js"],
    languageOptions: { globals: { ...globals.browser } },
  },
];
