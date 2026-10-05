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

test("Entrée sur une étiquette d'une carte filtre sans ouvrir la fiche", async ({ page }) => {
  const etiquette = page.locator(".carte", { hasText: "go-uptime" }).locator(".etiquette[data-competence='Docker']");
  await expect(etiquette).toBeVisible();   // focus() n'attend pas la fin du fondu
  await etiquette.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".filtre-actif strong")).toHaveText("Docker");
  await expect(page.locator("#modale")).toBeHidden();
});

test("fermer puis rouvrir aussitôt la fiche la laisse utilisable", async ({ page }) => {
  const carte = page.locator(".carte", { hasText: "mysh" });
  const modale = page.locator("#modale");
  await expect(carte).toBeVisible();
  await carte.focus();
  await page.keyboard.press("Enter");
  await expect(modale).toBeVisible();
  // Rouverte pendant le fondu de fermeture (150 ms).
  await page.keyboard.press("Escape");
  await page.keyboard.press("Enter");
  await expect(modale).toBeVisible();
  await expect(modale).not.toHaveAttribute("hidden");
  await expect(modale.locator(".modale-fermer")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(modale).toBeHidden();
});

test("le focus reste piégé dans la modale et l'arrière-plan est inerte", async ({ page }) => {
  const carte = page.locator(".carte", { hasText: "mysh" });
  await expect(carte).toBeVisible();
  await carte.focus();
  await page.keyboard.press("Enter");
  const modale = page.locator("#modale");
  await expect(modale.locator(".modale-fermer")).toBeFocused();
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  // Fermer, deux étiquettes (C, Linux), lien : Tab fait le tour puis revient au début.
  for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
  await expect(modale.locator(".modale-fermer")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(modale.locator(".modale-lien")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("main")).not.toHaveAttribute("inert");
  await expect(carte).toBeFocused();
});

test("après un filtre lancé depuis la modale, le focus va sur le bandeau du filtre", async ({ page }) => {
  await page.locator(".carte", { hasText: "mysh" }).click();
  await page.locator("#modale .etiquette[data-competence='Linux']").click();
  await expect(page.locator("#modale")).toBeHidden();
  await expect(page.locator(".filtre-actif")).toBeFocused();
  // « tout afficher » cache le bandeau : le focus passe au champ de recherche.
  await page.keyboard.press("Tab");
  await expect(page.locator(".effacer")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".carte")).toHaveCount(projets.length);
  await expect(page.locator("#recherche")).toBeFocused();
});

test("le bouton de thème expose son état et change d'icône", async ({ page }) => {
  const bouton = page.locator(".bouton-theme");
  const icone = () => bouton.evaluate((b) => getComputedStyle(b, "::before").content);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(bouton).toHaveAccessibleName("Thème sombre");
  await expect(bouton).toHaveAttribute("aria-pressed", "false");
  expect(await icone()).toContain("☾");
  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-pressed", "true");
  expect(await icone()).toContain("☀");
  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-pressed", "false");
});

test("sans choix mémorisé, le bouton de thème suit la préférence du système", async ({ page }) => {
  const bouton = page.locator(".bouton-theme");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(bouton).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(bouton).toHaveAttribute("aria-pressed", "false");
});

test("une liste de projets vide affiche un message au lieu de planter", async ({ page }) => {
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.route("**/data/projets.json", (route) => route.fulfill({ json: [] }));
  await page.reload();
  await expect(page.locator(".vide")).toHaveText("Aucun projet à afficher pour le moment.");
  await expect(page.locator(".vide")).toBeVisible();
  await expect(page.locator(".aide")).toHaveText("Aucune compétence à afficher pour le moment.");
  await expect(page.locator("#nb-projets")).toHaveText("0");
  await expect(page.locator("#nb-competences")).toHaveText("0");
  expect(erreurs).toEqual([]);
});

test("un identifiant numérique ouvre quand même la bonne fiche", async ({ page }) => {
  const projet = { ...projets[0], id: "42", titre: "Projet 42", competences: ["2024"] };
  await page.route("**/data/projets.json", (route) => route.fulfill({ json: [projet] }));
  await page.reload();
  await page.locator(".carte").click();
  await expect(page.locator("#modale-titre")).toHaveText("Projet 42");
  await page.locator("#modale .etiquette").click();
  await expect(page.locator(".carte")).toHaveCount(1);
});

test("après un lien du menu, Tab continue dans la section visée", async ({ page }) => {
  await page.locator(".nav a[href='#projets']").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#projets$/);
  await page.keyboard.press("Tab");
  await expect(page.locator("#recherche")).toBeFocused();
});

test.describe("avec prefers-reduced-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("les compteurs, fondus et défilements jQuery sont instantanés", async ({ page }) => {
    // Note chaque valeur écrite dans le compteur dès le chargement de la page.
    await page.addInitScript(() => {
      window.valeursCompteur = [];
      document.addEventListener("DOMContentLoaded", () => {
        const el = document.getElementById("nb-projets");
        new MutationObserver(() => window.valeursCompteur.push(el.textContent))
          .observe(el, { childList: true, characterData: true, subtree: true });
      });
    });
    await page.reload();
    await expect(page.locator("#nb-projets")).toHaveText(String(projets.length));
    expect(await page.evaluate(() => window.valeursCompteur)).toEqual([String(projets.length)]);

    // Juste après un filtre, sans attendre : toutes les cartes sont déjà visibles
    // et la page a déjà défilé jusqu'aux projets.
    const etat = await page.evaluate(() => {
      document.querySelector(".mot[data-competence='Python']").click();
      return {
        cartesCachees: [...document.querySelectorAll(".carte")]
          .filter((c) => getComputedStyle(c).display === "none" || getComputedStyle(c).opacity !== "1").length,
        defile: window.scrollY > 0,
      };
    });
    expect(etat).toEqual({ cartesCachees: 0, defile: true });
  });
});
