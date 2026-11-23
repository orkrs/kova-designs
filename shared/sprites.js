// Tiny procedural pixel sprites -> inline SVG. Colours come from CSS custom
// properties (--px-a … --px-f) so each design can repaint them.
const S = {
  pick: [
    "...aaaaaa...",
    ".aabbbbbbaa.",
    "abbaa..aabba",
    "aba....cdaba",
    ".a....cd..a.",
    ".....cd.....",
    "....cd......",
    "...cd.......",
    "..cd........",
    ".cd.........",
    "cd..........",
    "d...........",
  ],
  ore: [
    "aabaaaab",
    "abaccbaa",
    "aacdcaba",
    "abaccaab",
    "aaabaaaa",
    "abaaccba",
    "aabcdcaa",
    "aaaaabaa",
  ],
  gear: [
    "....aaa....",
    ".a..aaa..a.",
    ".aaaaaaaaa.",
    "..aaabaaa..",
    "aaaabbbaaaa",
    "aaabbbbbaaa",
    "aaaabbbaaaa",
    "..aaabaaa..",
    ".aaaaaaaaa.",
    ".a..aaa..a.",
    "....aaa....",
  ],
  tree: [
    "..aaaa..",
    ".abaaba.",
    "aaabaaaa",
    "abaaabaa",
    ".aabaaa.",
    "..aaaa..",
    "...cc...",
    "...cc...",
    "...cc...",
    ".dddddd.",
  ],
  flask: [
    "..aaaa..",
    "...ab...",
    "...ab...",
    "..a..a..",
    ".a....a.",
    "acccccca",
    "acdcccca",
    "acccccda",
    ".aaaaaa.",
  ],
  heart: [
    ".aa.aa.",
    "abaaaaa",
    "aaaaaaa",
    ".aaaaa.",
    "..aaa..",
    "...a...",
  ],
  miner: [
    "..aaaa..",
    ".aaaaaa.",
    ".bbbbbb.",
    ".bcbbcb.",
    ".bbbbbb.",
    "..dddd..",
    ".dddddd.",
    "bddddddb",
    "..e..e..",
    "..e..e..",
  ],
  fox: [
    "a.....a.",
    "aa...aa.",
    "abaaaba.",
    "aaacaaa.",
    ".aaaaa..",
    "..aaaaaa",
    "..aaaaab",
    "..a.a.a.",
  ],
  bolt: [
    "...aaa",
    "..aaa.",
    ".aaa..",
    "aaaaaa",
    "...aa.",
    "..aa..",
    ".aa...",
    "a.....",
  ],
};
const DEF = { a: "#2b2622", b: "#cfd4d8", c: "#7b4b2a", d: "#4a2c18", e: "#222" };
const PER = {
  ore: { a: "#6f6a66", b: "#57524e", c: "#d9733b", d: "#ffb26b" },
  gear: { a: "#9aa3ab", b: "transparent" },
  tree: { a: "#3f8f3a", b: "#59b34c", c: "#7b4b2a", d: "#5b3a22" },
  flask: { a: "#d8e2e8", b: "#ffffff", c: "#57d6b0", d: "#b9ffe9" },
  heart: { a: "#ff4d5e", b: "#ffd0d5" },
  miner: { a: "#f2c230", b: "#e8b48a", c: "#2b2622", d: "#3a6ea5", e: "#2b2622" },
  fox: { a: "#e8743b", b: "#fff3e6", c: "#2b2622" },
  bolt: { a: "#ffd23f" },
};
export function spriteSVG(name, label) {
  const rows = S[name];
  if (!rows) return "";
  const h = rows.length, w = rows[0].length;
  const pal = { ...DEF, ...(PER[name] || {}) };
  let r = "";
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === "." || !pal[ch]) return;
      r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="var(--px-${name}-${ch}, var(--px-${ch}, ${pal[ch]}))"/>`;
    });
  });
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg viewBox="0 0 ${w} ${h}" ${a11y} shape-rendering="crispEdges" focusable="false">${r}</svg>`;
}
export function renderSprites(root = document) {
  root.querySelectorAll("[data-sprite]").forEach((el) => {
    el.innerHTML = spriteSVG(el.dataset.sprite, el.dataset.label);
  });
}
renderSprites();
