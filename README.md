# Portfolio — Jean-Emmanuel Jacquier

[![Tests et déploiement](https://github.com/jejcqr/portfolio-web/actions/workflows/ci.yml/badge.svg)](https://github.com/jejcqr/portfolio-web/actions/workflows/ci.yml)

Mon site portfolio : une page qui présente tous mes projets GitHub, avec
recherche, filtres par catégorie et par compétence, fiche détaillée de chaque
projet et thème sombre. Site statique en **HTML**, **CSS** et **jQuery**,
déployé automatiquement sur GitHub Pages.

![Aperçu du portfolio](apercu.png)

## Compétences démontrées

| Compétence | Où la voir |
|---|---|
| HTML sémantique et accessible | `header`/`main`/`section`, modale `role="dialog"`, cartes utilisables au clavier, `aria-pressed` — `index.html` |
| CSS moderne | variables, thème clair/sombre (préférence système + choix mémorisé), grille responsive, `color-mix`, `prefers-reduced-motion` — `css/style.css` |
| jQuery | chargement AJAX (`$.getJSON`), délégation d'événements, animations, compteurs animés, défilement doux — `js/app.js` |
| JavaScript | logique de filtrage séparée du DOM, recherche insensible aux accents — `js/filtres.js` |
| Tests | tests unitaires `node --test` + 14 tests Playwright sur ordinateur et mobile |
| CI/CD | GitHub Actions : tests puis déploiement sur GitHub Pages |

## Fonctionnement

Les projets sont décrits dans [`data/projets.json`](data/projets.json) : ajouter
un projet ne demande aucune modification du code. Le nuage de compétences et
les compteurs sont calculés à partir de ce fichier.

```json
{
  "id": "go-uptime",
  "titre": "go-uptime",
  "resume": "Surveillance de sites web avec tableau de bord…",
  "details": "Une goroutine par site surveillé…",
  "competences": ["Go", "MongoDB", "Docker"],
  "categorie": "back-end",
  "depot": "https://github.com/jejcqr/go-uptime"
}
```

## Lancer en local

```bash
python3 -m http.server 8080      # ou : npm start
# puis ouvrir http://localhost:8080
```

## Tests

```bash
npm install
npm test                          # filtres et validité de projets.json
npx playwright install chromium
npm run test:e2e                  # recherche, filtres, modale, thème, mobile
```

## Mise en ligne

Activer GitHub Pages dans *Settings → Pages → Source : GitHub Actions*.
Chaque push sur `main` relance les tests puis publie le site.
