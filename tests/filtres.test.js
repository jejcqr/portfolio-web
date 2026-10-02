const test = require("node:test");
const assert = require("node:assert/strict");
const { filtrerProjets, compterCompetences, categories, normaliser } = require("../js/filtres.js");
const projets = require("../data/projets.json");

test("chaque projet a les champs attendus", () => {
  const ids = new Set();
  for (const p of projets) {
    for (const champ of ["id", "titre", "resume", "details", "categorie", "depot"]) {
      assert.ok(p[champ], `${p.id} : champ ${champ} manquant`);
    }
    assert.ok(p.competences.length > 0, `${p.id} : aucune compétence`);
    assert.match(p.depot, /^https:\/\/github\.com\/jejcqr\//);
    assert.ok(!ids.has(p.id), `id en double : ${p.id}`);
    ids.add(p.id);
  }
});

test("normaliser retire accents et majuscules", () => {
  assert.equal(normaliser("  Émissions CO₂ "), "emissions co₂");
});

test("sans critère, tous les projets sont gardés", () => {
  assert.equal(filtrerProjets(projets, {}).length, projets.length);
});

test("filtre par catégorie", () => {
  const ia = filtrerProjets(projets, { categorie: "ia" });
  assert.ok(ia.length > 0);
  assert.ok(ia.every((p) => p.categorie === "ia"));
});

test("filtre par compétence", () => {
  const go = filtrerProjets(projets, { competence: "Go" });
  assert.deepEqual(go.map((p) => p.id), ["go-uptime"]);
});

test("la recherche ignore les accents et combine les mots", () => {
  assert.deepEqual(filtrerProjets(projets, { recherche: "emissions" }).map((p) => p.id), ["analyse-donnees-r"]);
  assert.deepEqual(filtrerProjets(projets, { recherche: "python discord coran" }).map((p) => p.id), ["alhudabot"]);
  assert.equal(filtrerProjets(projets, { recherche: "zzzz" }).length, 0);
});

test("compterCompetences trie par fréquence", () => {
  const stats = compterCompetences([
    { competences: ["A", "B"] },
    { competences: ["B"] },
  ]);
  assert.deepEqual(stats, [{ nom: "B", nombre: 2 }, { nom: "A", nombre: 1 }]);
});

test("categories garde l'ordre d'apparition sans doublon", () => {
  assert.deepEqual(categories([{ categorie: "x" }, { categorie: "y" }, { categorie: "x" }]), ["x", "y"]);
});
