#!/usr/bin/env bash
# Génère docs/EXPLICATIONS.pdf à partir de docs/EXPLICATIONS.md.
# Dépendances : pandoc et weasyprint (pip install weasyprint).
set -euo pipefail

cd "$(dirname "$0")"

pandoc EXPLICATIONS.md \
    --from gfm+yaml_metadata_block \
    --to html5 --standalone \
    --toc --toc-depth=2 \
    --highlight-style=tango \
    --css pdf.css \
    --metadata lang=fr \
    --output EXPLICATIONS.html

weasyprint EXPLICATIONS.html EXPLICATIONS.pdf
rm EXPLICATIONS.html
echo "docs/EXPLICATIONS.pdf généré"
