/* Fonctions pures de filtrage, sans dépendance au DOM : testées avec node --test. */
(function (exports) {
  "use strict";

  function normaliser(texte) {
    return String(texte)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  }

  /** Garde les projets de la catégorie et de la compétence choisies qui contiennent la recherche. */
  function filtrerProjets(projets, criteres) {
    var recherche = normaliser(criteres.recherche || "");
    return projets.filter(function (p) {
      if (criteres.categorie && criteres.categorie !== "tous" && p.categorie !== criteres.categorie) {
        return false;
      }
      if (criteres.competence && p.competences.indexOf(criteres.competence) === -1) {
        return false;
      }
      if (!recherche) {
        return true;
      }
      var texte = normaliser([p.titre, p.resume, p.details].concat(p.competences).join(" "));
      return recherche.split(/\s+/).every(function (mot) {
        return texte.indexOf(mot) !== -1;
      });
    });
  }

  /** Nombre de projets par compétence, de la plus utilisée à la moins utilisée. */
  function compterCompetences(projets) {
    var compte = {};
    projets.forEach(function (p) {
      p.competences.forEach(function (c) {
        compte[c] = (compte[c] || 0) + 1;
      });
    });
    return Object.keys(compte)
      .map(function (nom) { return { nom: nom, nombre: compte[nom] }; })
      .sort(function (a, b) { return b.nombre - a.nombre || a.nom.localeCompare(b.nom, "fr"); });
  }

  function categories(projets) {
    var vues = [];
    projets.forEach(function (p) {
      if (vues.indexOf(p.categorie) === -1) vues.push(p.categorie);
    });
    return vues;
  }

  exports.normaliser = normaliser;
  exports.filtrerProjets = filtrerProjets;
  exports.compterCompetences = compterCompetences;
  exports.categories = categories;
})(typeof module !== "undefined" ? module.exports : (window.Filtres = {}));
