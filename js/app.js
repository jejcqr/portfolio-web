/* Affichage du portfolio avec jQuery. Les données viennent de data/projets.json. */
$(function () {
  "use strict";

  var LIBELLES = {
    tous: "Tous", "back-end": "Back-end", "système": "Système", data: "Data",
    infra: "Infra", ia: "IA", web: "Web", mobile: "Mobile", bots: "Bots Discord"
  };
  var projets = [];
  var criteres = { recherche: "", categorie: "tous", competence: null };
  var $grille = $("#grille");
  var $modale = $("#modale");
  var dernierFocus = null;

  // ---- Thème clair / sombre ----
  $(".bouton-theme").on("click", function () {
    var sombre = $("html").attr("data-theme") === "sombre" ||
      (!$("html").attr("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var nouveau = sombre ? "clair" : "sombre";
    $("html").attr("data-theme", nouveau);
    try { localStorage.setItem("theme", nouveau); } catch (e) { /* stockage indisponible */ }
  });

  // ---- Rendu ----
  function etiquettes(liste) {
    return liste.map(function (c) {
      return $("<li>").append($("<button type='button' class='etiquette'>").text(c).attr("data-competence", c));
    });
  }

  function afficherProjets() {
    var visibles = Filtres.filtrerProjets(projets, criteres);
    $grille.empty();
    visibles.forEach(function (p, i) {
      var $carte = $("<article class='carte' tabindex='0'>")
        .attr("data-id", p.id)
        .attr("aria-label", "Voir le détail de " + p.titre)
        .append($("<span class='categorie'>").text(LIBELLES[p.categorie] || p.categorie))
        .append($("<h3>").text(p.titre))
        .append($("<p>").text(p.resume))
        .append($("<ul class='etiquettes'>").append(etiquettes(p.competences)));
      $carte.hide().appendTo($grille).delay(i * 40).fadeIn(200);
    });
    $(".vide").prop("hidden", visibles.length > 0);
    $(".filtre-actif").prop("hidden", !criteres.competence)
      .find("strong").text(criteres.competence || "");
  }

  function afficherCategories() {
    var $zone = $(".categories");
    ["tous"].concat(Filtres.categories(projets)).forEach(function (cat) {
      $("<button type='button' class='filtre'>")
        .text(LIBELLES[cat] || cat)
        .attr("data-categorie", cat)
        .attr("aria-pressed", cat === "tous")
        .appendTo($zone);
    });
  }

  function afficherNuage() {
    var stats = Filtres.compterCompetences(projets);
    var max = stats[0].nombre;
    stats.forEach(function (s) {
      $("<button type='button' class='mot'>")
        .text(s.nom)
        .attr("data-competence", s.nom)
        .attr("title", s.nombre + " projet(s)")
        .css("font-size", (0.9 + 0.9 * s.nombre / max).toFixed(2) + "rem")
        .appendTo("#nuage");
    });
    animerCompteur($("#nb-projets"), projets.length);
    animerCompteur($("#nb-competences"), stats.length);
  }

  function animerCompteur($el, cible) {
    $({ valeur: 0 }).animate({ valeur: cible }, {
      duration: 900,
      easing: "swing",
      step: function () { $el.text(Math.round(this.valeur)); },
      complete: function () { $el.text(cible); }
    });
  }

  // ---- Filtres ----
  var minuterie;
  $("#recherche").on("input", function () {
    var valeur = $(this).val();
    clearTimeout(minuterie);
    minuterie = setTimeout(function () {   // évite de tout redessiner à chaque touche
      criteres.recherche = valeur;
      afficherProjets();
    }, 150);
  });

  $(".categories").on("click", ".filtre", function () {
    criteres.categorie = $(this).data("categorie");
    $(".filtre").attr("aria-pressed", false);
    $(this).attr("aria-pressed", true);
    afficherProjets();
  });

  function filtrerParCompetence(nom) {
    criteres.competence = nom;
    fermerModale();
    afficherProjets();
    $("html, body").animate({ scrollTop: $("#projets").offset().top - 70 }, 400);
  }

  $(document).on("click", ".etiquette, .mot", function (e) {
    e.stopPropagation();
    filtrerParCompetence($(this).data("competence"));
  });

  $(".effacer").on("click", function (e) {
    e.preventDefault();
    criteres.competence = null;
    afficherProjets();
  });

  // ---- Modale de détail ----
  function ouvrirModale(id) {
    var p = projets.find(function (x) { return x.id === id; });
    if (!p) return;
    dernierFocus = document.activeElement;
    $modale.find("#modale-titre").text(p.titre);
    $modale.find(".modale-details").text(p.details);
    $modale.find(".modale-competences").empty().append(etiquettes(p.competences));
    $modale.find(".modale-lien").attr("href", p.depot);
    $modale.prop("hidden", false).hide().fadeIn(150);
    $modale.find(".modale-fermer").trigger("focus");
    $("body").addClass("sans-defilement");
  }

  function fermerModale() {
    if ($modale.prop("hidden")) return;
    $modale.fadeOut(150, function () { $modale.prop("hidden", true); });
    $("body").removeClass("sans-defilement");
    if (dernierFocus) dernierFocus.focus();
  }

  $grille.on("click", ".carte", function () { ouvrirModale($(this).data("id")); });
  $grille.on("keydown", ".carte", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      ouvrirModale($(this).data("id"));
    }
  });
  $modale.on("click", ".modale-fond, .modale-fermer", fermerModale);
  $(document).on("keydown", function (e) { if (e.key === "Escape") fermerModale(); });

  // ---- Défilement doux de la navigation ----
  $(".nav a[href^='#']").on("click", function (e) {
    var $cible = $($(this).attr("href"));
    if ($cible.length) {
      e.preventDefault();
      $("html, body").animate({ scrollTop: $cible.offset().top - 70 }, 400);
    }
  });

  // ---- Chargement ----
  $.getJSON("data/projets.json")
    .done(function (donnees) {
      projets = donnees;
      afficherCategories();
      afficherProjets();
      afficherNuage();
    })
    .fail(function () {
      $grille.html("<p class='vide'>Impossible de charger les projets.</p>");
    });
});
