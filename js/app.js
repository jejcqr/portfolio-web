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
  var $arrierePlan = $(".entete, main, .pied");   // tout ce que la modale recouvre
  var dernierFocus = null;

  // ---- Animations : coupées si le système demande moins de mouvement ----
  // La règle CSS prefers-reduced-motion ne touche pas aux animations jQuery.
  var moinsDeMouvement = window.matchMedia("(prefers-reduced-motion: reduce)");
  $.fx.off = moinsDeMouvement.matches;
  moinsDeMouvement.addEventListener("change", function (e) { $.fx.off = e.matches; });

  // ---- Thème clair / sombre ----
  var $boutonTheme = $(".bouton-theme");
  var systemeSombre = window.matchMedia("(prefers-color-scheme: dark)");

  function themeSombre() {
    var choix = $("html").attr("data-theme");
    return choix ? choix === "sombre" : systemeSombre.matches;
  }

  // L'icône suit le thème en CSS ; aria-pressed expose l'état aux lecteurs d'écran.
  function majBoutonTheme() {
    $boutonTheme.attr("aria-pressed", themeSombre());
  }

  $boutonTheme.on("click", function () {
    var nouveau = themeSombre() ? "clair" : "sombre";
    $("html").attr("data-theme", nouveau);
    try { localStorage.setItem("theme", nouveau); } catch (e) { /* stockage indisponible */ }
    majBoutonTheme();
  });
  systemeSombre.addEventListener("change", majBoutonTheme);   // sans choix mémorisé, le système décide
  majBoutonTheme();

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
      $carte.appendTo($grille);
      // Fondu en cascade, sauf animations coupées : delay() ne tient pas compte de $.fx.off.
      if (!$.fx.off) $carte.hide().delay(i * 40).fadeIn(200);
    });
    $(".vide").prop("hidden", visibles.length > 0).text(projets.length
      ? "Aucun projet ne correspond à cette recherche."
      : "Aucun projet à afficher pour le moment.");
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
    var max = stats.length ? stats[0].nombre : 0;   // liste triée : la première est la plus utilisée
    if (!stats.length) $(".aide").text("Aucune compétence à afficher pour le moment.");
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
    criteres.categorie = $(this).attr("data-categorie");
    $(".filtre").attr("aria-pressed", false);
    $(this).attr("aria-pressed", true);
    afficherProjets();
  });

  function filtrerParCompetence(nom) {
    criteres.competence = nom;
    fermerModale();
    afficherProjets();
    // Défilement doux en CSS (scroll-behavior), sous l'en-tête grâce à scroll-padding-top.
    document.getElementById("projets").scrollIntoView();
    // Le focus suit le défilement vers les résultats ; l'élément d'origine (étiquette d'une
    // carte, ou carte rendue par fermerModale) vient d'ailleurs d'être détruit.
    $(".filtre-actif")[0].focus({ preventScroll: true });
  }

  $(document).on("click", ".etiquette, .mot", function (e) {
    e.stopPropagation();
    filtrerParCompetence($(this).attr("data-competence"));
  });

  $(".effacer").on("click", function (e) {
    e.preventDefault();
    criteres.competence = null;
    afficherProjets();
    $("#recherche").trigger("focus");   // le lien vient d'être caché avec son bandeau
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
    // stop(true, true) termine un fondu de fermeture en cours, dont le rappel remettrait hidden.
    $modale.stop(true, true).prop("hidden", false).hide().fadeIn(150);
    $arrierePlan.prop("inert", true);   // ni clic, ni focus, ni lecteur d'écran derrière la modale
    $modale.find(".modale-fermer").trigger("focus");
    $("body").addClass("sans-defilement");
  }

  function fermerModale() {
    if ($modale.prop("hidden")) return;
    $modale.fadeOut(150, function () { $modale.prop("hidden", true); });
    $arrierePlan.prop("inert", false);   // avant de rendre le focus : un élément inerte le refuse
    $("body").removeClass("sans-defilement");
    if (dernierFocus) dernierFocus.focus();
  }

  // .attr() et non .data(), qui convertirait data-id="42" en nombre.
  $grille.on("click", ".carte", function () { ouvrirModale($(this).attr("data-id")); });
  $grille.on("keydown", ".carte", function (e) {
    // Seulement sur la carte elle-même : Entrée sur une étiquette doit garder son clic.
    if (e.target !== this) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      ouvrirModale($(this).attr("data-id"));
    }
  });
  $modale.on("click", ".modale-fond, .modale-fermer", fermerModale);
  // Piège à focus : Tab et Maj+Tab bouclent sur les éléments de la modale.
  $modale.on("keydown", function (e) {
    if (e.key !== "Tab") return;
    var $elements = $modale.find("a[href], button:not(:disabled)");
    var premier = $elements.get(0), dernier = $elements.get(-1);
    if (e.shiftKey && document.activeElement === premier) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && document.activeElement === dernier) {
      e.preventDefault();
      premier.focus();
    }
  });
  $(document).on("keydown", function (e) { if (e.key === "Escape") fermerModale(); });

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
