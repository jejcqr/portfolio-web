const { test, expect } = require("@playwright/test");
const path = require("path");
const projets = require("../data/projets.json");

test.beforeEach(async ({ page }) => {
  // jQuery est servi depuis node_modules : les tests ne dépendent pas du réseau.
  await page.route("https://code.jquery.com/**", (route) =>
    route.fulfill({ path: path.join(__dirname, "../node_modules/jquery/dist/jquery.min.js"), contentType: "application/javascript" })
  );
  await page.goto("/");
});

test("affiche tous les projets et les compteurs", async ({ page }) => {
  await expect(page.locator(".carte")).toHaveCount(projets.length);
  await expect(page.locator("#nb-projets")).toHaveText(String(projets.length));
});

test("la recherche filtre les cartes", async ({ page }) => {
  await page.fill("#recherche", "mongodb");
  await expect(page.locator(".carte")).toHaveCount(1);
  await expect(page.locator(".carte h3")).toHaveText("go-uptime");
  await page.fill("#recherche", "introuvable");
  await expect(page.locator(".vide")).toBeVisible();
});

test("les catégories filtrent les cartes", async ({ page }) => {
  await page.click(".filtre[data-categorie='bots']");
  await expect(page.locator(".carte")).toHaveCount(2);
  await page.click(".filtre[data-categorie='tous']");
  await expect(page.locator(".carte")).toHaveCount(projets.length);
});

test("une compétence du nuage filtre les projets", async ({ page }) => {
  await page.click(".mot[data-competence='Docker']");
  const attendus = projets.filter((p) => p.competences.includes("Docker")).length;
  await expect(page.locator(".carte")).toHaveCount(attendus);
  await expect(page.locator(".filtre-actif strong")).toHaveText("Docker");
  await page.click(".effacer");
  await expect(page.locator(".carte")).toHaveCount(projets.length);
});

test("la modale s'ouvre au clic et se ferme avec Échap", async ({ page }) => {
  await page.locator(".carte", { hasText: "mysh" }).click();
  const modale = page.locator("#modale");
  await expect(modale).toBeVisible();
  await expect(modale.locator(".modale-lien")).toHaveAttribute("href", "https://github.com/jejcqr/mini-shell-c");
  await page.keyboard.press("Escape");
  await expect(modale).toBeHidden();
});

test("le thème sombre est mémorisé", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.click(".bouton-theme");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sombre");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sombre");
});

test("pas de défilement horizontal", async ({ page }) => {
  await expect(page.locator(".carte")).toHaveCount(projets.length);
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(deborde).toBe(false);
});
