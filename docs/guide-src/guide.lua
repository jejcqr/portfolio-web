-- Filtre pandoc : transforme EXPLICATIONS.md en guide interactif (docs/guide/index.html).
--
-- Le Markdown reste la seule source du contenu ; ce filtre n'ajoute que la structure
-- interactive, repérée par le numéro des titres de niveau 1 :
--   4. étapes   : case « J'ai fait cette étape », code de solution replié
--   5. pièges   : code naïf visible, quiz sur la règle à retenir, explication repliée
--   6. check-list : une case à cocher par ligne du tableau
--   8. glossaire : champ de recherche
-- Le comportement (mémorisation, quiz, recherche) est dans guide.js.

local stringify = pandoc.utils.stringify

local function html(s)
  return pandoc.RawBlock("html", s)
end

local function escape(s)
  return (s:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"):gsub('"', "&quot;"))
end

-- Numéro de la partie : « 4. Refaire… » donne "4".
local function section_number(header)
  return stringify(header):match("^(%d+)%.")
end

-- Premier paragraphe qui commence par un texte en gras donné.
local function starts_with_strong(block, label)
  if block.t ~= "Para" or #block.content == 0 then
    return false
  end
  local first = block.content[1]
  return first.t == "Strong" and stringify(first):find(label, 1, true) == 1
end

local function render_inlines(inlines)
  return pandoc.write(pandoc.Pandoc({ pandoc.Plain(inlines) }), "html")
end

local function render_blocks(blocks)
  return pandoc.write(pandoc.Pandoc(blocks), "html")
end

-- Case à cocher dont l'état est mémorisé par guide.js sous la clé `key`.
local function checkbox(key, label)
  return string.format(
    '<label class="fait"><input type="checkbox" data-suivi="%s"> %s</label>',
    escape(key), label)
end

local function fold_code(block, summary)
  return {
    html('<details class="code-replie"><summary>' .. summary .. "</summary>"),
    block,
    html("</details>"),
  }
end

local LANGUAGES = {
  bash = "Bash", sh = "Shell", c = "C", go = "Go", python = "Python", r = "R",
  powershell = "PowerShell", sql = "SQL", yaml = "YAML", json = "JSON", html = "HTML",
  css = "CSS", javascript = "JavaScript", js = "JavaScript", dockerfile = "Dockerfile",
  toml = "TOML", ini = "INI", nginx = "nginx", make = "Makefile", makefile = "Makefile",
}

-- 4. Étapes : le code donné avant « Vérifier » est la solution, replié pour qu'on
-- essaie d'abord soi-même. Ce qui suit « Vérifier » (commandes, tests, sorties) et
-- les sorties (blocs « text ») restent visibles.
local function transform_step(div)
  local out = {}
  local verifying = false
  for i, block in ipairs(div.content) do
    if starts_with_strong(block, "Vérifier") then
      verifying = true
    elseif starts_with_strong(block, "Le piège à cette étape") then
      verifying = false
    end
    if i == 1 and block.t == "Header" then
      table.insert(out, block)
      table.insert(out, html(checkbox("etape:" .. div.identifier, "J'ai fait cette étape")))
    elseif block.t == "CodeBlock" and block.classes[1] ~= "text" and not verifying then
      local language = LANGUAGES[block.classes[1]] or block.classes[1]
      local summary = "Voir la solution" .. (language and (" (" .. language .. ")") or "")
      for _, b in ipairs(fold_code(block, summary)) do
        table.insert(out, b)
      end
    elseif starts_with_strong(block, "Le piège à cette étape") then
      table.insert(out, html('<div class="piege-etape">'))
      table.insert(out, block)
      table.insert(out, html("</div>"))
    else
      table.insert(out, block)
    end
  end
  div.content = out
  div.classes:insert("etape")
  return div
end

-- Texte « À retenir » d'un piège, sans le libellé en gras.
local function takeaway(div)
  for _, block in ipairs(div.content) do
    if block.t == "BlockQuote" and starts_with_strong(block.content[1] or {}, "À retenir") then
      local inlines = pandoc.List(block.content[1].content)
      inlines:remove(1)
      while #inlines > 0 and (inlines[1].t == "Space" or inlines[1].t == "SoftBreak") do
        inlines:remove(1)
      end
      return inlines
    end
  end
  return nil
end

-- Petit générateur déterministe : le guide est identique d'une génération à l'autre.
local function seeded(seed)
  local state = seed
  return function(n)
    state = (state * 1103515245 + 12345) % 2147483648
    return state % n + 1
  end
end

local function seed_of(s)
  local h = 0
  for i = 1, #s do
    h = (h * 31 + s:byte(i)) % 2147483648
  end
  return h
end

-- Quiz : quelle règle aurait évité ce code ? La bonne réponse et trois règles des
-- autres pièges, dans un ordre fixe mais propre à chaque piège.
local function quiz(div, index, rules)
  local rand = seeded(seed_of(div.identifier))
  local others = {}
  for j = 1, #rules do
    if j ~= index then
      table.insert(others, j)
    end
  end
  local choices = { index }
  while #choices < 4 and #others > 0 do
    table.insert(choices, table.remove(others, rand(#others)))
  end
  for j = #choices, 2, -1 do
    local k = rand(j)
    choices[j], choices[k] = choices[k], choices[j]
  end

  local name = "quiz-" .. div.identifier
  local parts = {
    string.format('<form class="quiz" data-quiz="%s">', escape(name)),
    "<fieldset><legend>Quelle règle aurait évité ce code ?</legend>",
  }
  for n, j in ipairs(choices) do
    table.insert(parts, string.format(
      '<label><input type="radio" name="%s" value="%d"%s> <span>%s</span></label>',
      escape(name), n, j == index and " data-correct" or "", render_inlines(rules[j])))
  end
  table.insert(parts, '</fieldset><button type="submit">Valider</button>'
    .. '<p class="quiz-retour" role="status" aria-live="polite"></p></form>')
  return html(table.concat(parts, "\n"))
end

-- 5. Pièges : le code naïf reste visible, le quiz vient ensuite, puis l'explication
-- complète (conséquence, cause, bonne pratique, protection, à retenir) est repliée.
local function transform_pitfall(div, index, rules)
  local split
  for i, block in ipairs(div.content) do
    if starts_with_strong(block, "Ce qui se passe") then
      split = i
      break
    end
  end
  if not split then
    return div
  end
  local out = {}
  for i = 1, split - 1 do
    table.insert(out, div.content[i])
  end
  if #rules >= 2 then
    table.insert(out, quiz(div, index, rules))
  end
  table.insert(out, html('<details class="explication"><summary>Voir l\'explication et la bonne pratique</summary>'))
  for i = split, #div.content do
    table.insert(out, div.content[i])
  end
  table.insert(out, html("</details>"))
  div.content = out
  div.classes:insert("piege")
  return div
end

-- 6. Check-list : la table devient une liste de lignes à cocher.
local function checklist_table(tbl, prefix)
  local head = {}
  for _, cell in ipairs(tbl.head.rows[1].cells) do
    table.insert(head, '<th scope="col">' .. render_blocks(cell.contents) .. "</th>")
  end
  local parts = {
    '<table class="check-list"><thead><tr><th scope="col">Vérifié</th>'
      .. table.concat(head) .. "</tr></thead><tbody>",
  }
  local n = 0
  for _, body in ipairs(tbl.bodies) do
    for _, row in ipairs(body.body) do
      n = n + 1
      local cells = {}
      for c, cell in ipairs(row.cells) do
        local content = render_blocks(cell.contents)
        if c == 1 then
          cells[c] = '<th scope="row">' .. content .. "</th>"
        else
          cells[c] = "<td>" .. content .. "</td>"
        end
      end
      table.insert(parts, string.format(
        '<tr><td class="case"><input type="checkbox" data-suivi="%s:%d" aria-label="Vérifié : %s"></td>%s</tr>',
        prefix, n, escape(stringify(row.cells[1].contents)), table.concat(cells)))
    end
  end
  table.insert(parts, "</tbody></table>")
  return html(table.concat(parts, "\n"))
end

local function transform_checklist(div)
  local count = 0
  div.content = div.content:walk({
    Table = function(tbl)
      count = count + 1
      return checklist_table(tbl, "check-list:" .. count)
    end,
  })
  return div
end

-- 8. Glossaire : un champ de recherche avant la première table ; guide.js filtre
-- toutes les tables du glossaire.
local function transform_glossary(div)
  local out = {}
  local searched = false
  for _, block in ipairs(div.content) do
    if block.t == "Table" and not searched then
      searched = true
      table.insert(out, html(
        '<div class="recherche"><label for="recherche-glossaire">Rechercher un terme</label>'
          .. '<input type="search" id="recherche-glossaire" autocomplete="off">'
          .. '<p class="recherche-resultat" role="status" aria-live="polite"></p></div>'))
    end
    if block.t == "Table" then
      block.classes:insert("glossaire")
    end
    table.insert(out, block)
  end
  div.content = out
  return div
end

function Pandoc(doc)
  -- Titre de la page : le nom du projet, sans le « — explications » de la fiche.
  if doc.meta.title then
    doc.meta["guide-titre"] = (stringify(doc.meta.title):gsub("%s*—%s*explications%s*$", ""))
  end
  local blocks = pandoc.utils.make_sections(false, nil, doc.blocks)
  for k, part in ipairs(blocks) do
    if part.t == "Div" and part.content[1] and part.content[1].t == "Header" then
      local number = section_number(part.content[1])
      local subsections = {}
      for i, child in ipairs(part.content) do
        if child.t == "Div" and child.content[1] and child.content[1].t == "Header" then
          table.insert(subsections, i)
        end
      end
      if number == "4" then
        for _, i in ipairs(subsections) do
          part.content[i] = transform_step(part.content[i])
        end
      elseif number == "5" then
        local rules, owners = {}, {}
        for _, i in ipairs(subsections) do
          local rule = takeaway(part.content[i])
          if rule then
            table.insert(rules, rule)
            owners[i] = #rules
          end
        end
        for _, i in ipairs(subsections) do
          if owners[i] then
            part.content[i] = transform_pitfall(part.content[i], owners[i], rules)
          end
        end
      elseif number == "6" then
        part = transform_checklist(part)
      elseif number == "8" then
        part = transform_glossary(part)
      end
      blocks[k] = part
    end
  end
  doc.blocks = blocks
  return doc
end
