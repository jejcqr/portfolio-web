#!/usr/bin/env bash
# Génère docs/guide/index.html, le guide interactif, à partir de docs/EXPLICATIONS.md.
# Le fichier produit est autonome (styles et script intégrés) et se lit hors ligne.
# Dépendance : pandoc (3.1 ou plus récent).
set -euo pipefail

cd "$(dirname "$0")"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

{ echo "<style>"; cat guide-src/guide.css; echo "</style>"; } > "$tmp/styles.html"
{ echo "<script>"; cat guide-src/guide.js; echo "</script>"; } > "$tmp/script.html"

mkdir -p guide
pandoc EXPLICATIONS.md \
    --from gfm+yaml_metadata_block \
    --to html5 --standalone \
    --template guide-src/modele.html \
    --lua-filter guide-src/guide.lua \
    --toc --toc-depth=2 \
    --highlight-style=tango \
    --metadata lang=fr \
    --include-in-header "$tmp/styles.html" \
    --include-after-body "$tmp/script.html" \
    --output guide/index.html

echo "docs/guide/index.html généré"
