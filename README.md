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
| HTML sémantique et accessible | `header`/`main`/`section`, modale `role="dialog"` avec piège à focus et arrière-plan `inert`, cartes utilisables au clavier, `aria-pressed` — `index.html`, `js/app.js` |
| CSS moderne | variables, thème clair/sombre (préférence système + choix mémorisé), grille responsive, `color-mix`, défilement doux (`scroll-behavior`), `prefers-reduced-motion` — `css/style.css` |
| jQuery | chargement AJAX (`$.getJSON`), délégation d'événements, animations et compteurs animés, coupés par `prefers-reduced-motion` — `js/app.js` |
| JavaScript | logique de filtrage séparée du DOM, recherche insensible aux accents — `js/filtres.js` |
| Tests | 9 tests unitaires `node --test` + 34 tests Playwright sur ordinateur et mobile |
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
npm start      # lance python3 -m http.server 8080 --bind 127.0.0.1
# puis ouvrir http://127.0.0.1:8080
```

`npm start` ne télécharge rien : il lance le serveur intégré à Python 3, le même
que celui que démarrent les tests Playwright.

## Documentation

[`docs/EXPLICATIONS.md`](docs/EXPLICATIONS.md) ([PDF](docs/EXPLICATIONS.pdf)) explique l'architecture du projet, le code pas à pas et ce qu'on apprend en le réalisant soi-même. Le PDF est régénéré automatiquement par la CI à chaque modification du Markdown.

## Tests

```bash
npm install
npm test                          # filtres et validité de projets.json
npx playwright install chromium
npm run test:e2e                  # recherche, filtres, modale, clavier, thème, mobile
```

## Mise en ligne

Activer GitHub Pages dans *Settings → Pages → Source : GitHub Actions*.
Chaque push sur `main` relance les tests puis publie le site.
