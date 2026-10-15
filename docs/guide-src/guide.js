// Guide interactif : progression mémorisée, quiz, copie du code, recherche du glossaire.
// Aucune dépendance ; sans JavaScript, le guide reste lisible (le code se déplie quand même).
(() => {
  "use strict";

  const cle = "guide:" + (document.body.getAttribute("data-guide") || location.pathname);
  let etat = { suivi: {}, quiz: {} };

  // Le stockage peut être indisponible (navigation privée, fichier local bloqué) :
  // le guide fonctionne alors sans mémoriser.
  function charger() {
    try {
      const brut = localStorage.getItem(cle);
      if (brut) {
        const lu = JSON.parse(brut);
        if (lu && typeof lu === "object") {
          etat.suivi = lu.suivi && typeof lu.suivi === "object" ? lu.suivi : {};
          etat.quiz = lu.quiz && typeof lu.quiz === "object" ? lu.quiz : {};
        }
      }
    } catch { /* stockage illisible : on repart de zéro */ }
  }
  function enregistrer() {
    try { localStorage.setItem(cle, JSON.stringify(etat)); } catch { /* non mémorisé */ }
  }

  const cases = Array.from(document.querySelectorAll("input[data-suivi]"));
  const quizs = Array.from(document.querySelectorAll("form.quiz"));

  function majCase(c) {
    const section = c.closest("section.etape");
    if (section) {
      section.classList.toggle("est-faite", c.checked);
      const lien = document.querySelector('.sommaire a[href="#' + section.id + '"]');
      if (lien) lien.classList.toggle("fait-ok", c.checked);
    }
    const ligne = c.closest("tr");
    if (ligne) ligne.classList.toggle("cochee", c.checked);
  }

  function majProgression() {
    const faites = cases.filter(function (c) { return c.checked; }).length;
    const etapes = cases.filter(function (c) { return c.closest("section.etape"); });
    const etapesFaites = etapes.filter(function (c) { return c.checked; }).length;
    const texte = document.getElementById("progression-texte");
    const barre = document.getElementById("progression-barre");
    texte.textContent = "Progression : " + etapesFaites + " / " + etapes.length + " étapes, " +
      (faites - etapesFaites) + " / " + (cases.length - etapes.length) + " points de check-list";
    barre.max = Math.max(cases.length, 1);
    barre.value = faites;

    let repondus = 0, justes = 0;
    quizs.forEach(function (q) {
      const r = etat.quiz[q.getAttribute("data-quiz")];
      if (r) { repondus++; if (r.premier) justes++; }
    });
    document.getElementById("quiz-score").textContent = quizs.length
      ? "Quiz : " + justes + " juste(s) du premier coup, " + repondus + " / " + quizs.length + " répondu(s)"
      : "";
  }

  cases.forEach(function (c) {
    c.addEventListener("change", function () {
      if (c.checked) etat.suivi[c.getAttribute("data-suivi")] = true;
      else delete etat.suivi[c.getAttribute("data-suivi")];
      enregistrer();
      majCase(c);
      majProgression();
    });
  });

  function afficherReponse(q, choix, premier) {
    const retour = q.querySelector(".quiz-retour");
    const labels = Array.from(q.querySelectorAll("label"));
    let bon = false, trouve = false;
    labels.forEach(function (l) {
      const radio = l.querySelector("input");
      l.classList.remove("bonne", "mauvaise");
      if (radio.value === choix) {
        radio.checked = true;
        trouve = true;
        bon = radio.hasAttribute("data-correct");
        l.classList.add(bon ? "bonne" : "mauvaise");
      }
    });
    if (!trouve) return;
    retour.className = "quiz-retour " + (bon ? "ok" : "ko");
    retour.textContent = bon
      ? (premier ? "Bonne réponse." : "Bonne réponse (pas du premier coup).") + " L'explication est dépliée ci-dessous."
      : "Ce n'est pas la règle qui s'applique ici : relisez le code et réessayez.";
    if (bon) {
      const explication = q.parentNode.querySelector("details.explication");
      if (explication) explication.open = true;
    }
  }

  quizs.forEach(function (q) {
    const id = q.getAttribute("data-quiz");
    q.addEventListener("submit", function (ev) {
      ev.preventDefault();
      const coche = q.querySelector("input:checked");
      const retour = q.querySelector(".quiz-retour");
      if (!coche) {
        retour.className = "quiz-retour ko";
        retour.textContent = "Choisissez d'abord une réponse.";
        return;
      }
      const precedent = etat.quiz[id];
      // « premier » ne change plus une fois la première tentative enregistrée.
      const premier = precedent ? precedent.premier : coche.hasAttribute("data-correct");
      etat.quiz[id] = { choix: coche.value, premier: premier };
      enregistrer();
      afficherReponse(q, coche.value, premier);
      majProgression();
    });
  });

  document.getElementById("reinitialiser").addEventListener("click", function () {
    if (!window.confirm("Effacer les cases cochées et les réponses aux quiz de ce guide ?")) return;
    etat = { suivi: {}, quiz: {} };
    try { localStorage.removeItem(cle); } catch { /* rien à effacer */ }
    cases.forEach(function (c) { c.checked = false; majCase(c); });
    quizs.forEach(function (q) {
      q.reset();
      q.querySelectorAll("label").forEach(function (l) { l.classList.remove("bonne", "mauvaise"); });
      const retour = q.querySelector(".quiz-retour");
      retour.className = "quiz-retour";
      retour.textContent = "";
    });
    majProgression();
  });

  // Bouton « Copier » sur chaque bloc de code.
  document.querySelectorAll("pre").forEach(function (pre) {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "copier";
    bouton.textContent = "Copier";
    bouton.setAttribute("aria-label", "Copier ce bloc de code");
    bouton.addEventListener("click", function () {
      const texte = pre.querySelector("code") ? pre.querySelector("code").textContent : pre.textContent;
      function fini(message) {
        bouton.textContent = message;
        setTimeout(function () { bouton.textContent = "Copier"; }, 1500);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texte).then(function () { fini("Copié"); }, function () { fini("Échec"); });
      } else {
        const zone = document.createElement("textarea");
        zone.value = texte;
        zone.setAttribute("readonly", "");
        zone.style.position = "fixed";
        zone.style.opacity = "0";
        document.body.appendChild(zone);
        zone.select();
        let ok;
        try { ok = document.execCommand("copy"); } catch { ok = false; }
        document.body.removeChild(zone);
        fini(ok ? "Copié" : "Échec");
      }
    });
    pre.appendChild(bouton);
  });

  // Recherche dans le glossaire, insensible à la casse et aux accents.
  function normaliser(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }
  const recherche = document.getElementById("recherche-glossaire");
  const tables = Array.from(document.querySelectorAll("table.glossaire"));
  if (recherche && tables.length) {
    const lignes = tables.flatMap((t) => Array.from(t.querySelectorAll("tbody tr")));
    const resultat = document.querySelector(".recherche-resultat");
    recherche.addEventListener("input", function () {
      const terme = normaliser(recherche.value.trim());
      let visibles = 0;
      lignes.forEach(function (l) {
        const garde = !terme || normaliser(l.textContent).indexOf(terme) !== -1;
        l.hidden = !garde;
        if (garde) visibles++;
      });
      // Une table sans ligne retenue disparaît, en-tête compris.
      tables.forEach(function (t) {
        t.hidden = !Array.from(t.querySelectorAll("tbody tr")).some((l) => !l.hidden);
      });
      resultat.textContent = terme ? visibles + " terme(s) sur " + lignes.length : "";
    });
  }

  // Sommaire replié par défaut sur petit écran.
  const sommaire = document.getElementById("sommaire-details");
  if (sommaire && window.matchMedia("(max-width: 60rem)").matches) sommaire.open = false;

  // À l'impression, tout est déplié.
  window.addEventListener("beforeprint", function () {
    document.querySelectorAll("main details").forEach(function (d) { d.open = true; });
  });

  charger();
  cases.forEach(function (c) {
    c.checked = etat.suivi[c.getAttribute("data-suivi")] === true;
    majCase(c);
  });
  quizs.forEach(function (q) {
    const memo = etat.quiz[q.getAttribute("data-quiz")];
    if (memo && typeof memo.choix === "string") afficherReponse(q, memo.choix, memo.premier);
  });
  majProgression();
})();
