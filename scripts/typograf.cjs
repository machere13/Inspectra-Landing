#!/usr/bin/env node
// Типограф для лендинга: ставит неразрывный пробел после коротких предлогов/союзов
// и перед тире. Обрабатывает русский текст в src/data/*.ts (строковые литералы) и
// в *.astro (тело шаблона). Защищены: frontmatter, <script>, <style> — там код/бегущие
// строки хиро не трогаются.
//
//   node scripts/typograf.cjs         # применить
//   node scripts/typograf.cjs --dry   # показать, что изменится

const fs = require("fs");
const path = require("path");

const DRY = process.argv.includes("--dry");
const ROOT = path.resolve(__dirname, "..");
const NBSP = " ";

const SHORT = [
  "обо", "ото", "изо", "через", "перед", "между", "чтобы", "либо",
  "во", "со", "ко", "для", "без", "при", "над", "под", "про", "или",
  "что", "как", "чем", "если", "уже", "их",
  "в", "с", "к", "у", "о", "об", "по", "до", "от", "из", "за", "на",
  "и", "а", "но", "же", "ли", "бы", "то", "не",
];
const group = SHORT.join("|");
const reNbsp = new RegExp(`(?<![\\p{L}\\p{N}_])(${group})[ \\t]+(?=\\S)`, "giu");
const reDash = /([^\s ])[  ]+[-–—][  ]+(?=\S)/gu;

function typo(s) {
  let out = s.replace(reDash, `$1${NBSP}— `);
  let prev;
  do {
    prev = out;
    out = out.replace(reNbsp, `$1${NBSP}`);
  } while (out !== prev);
  return out;
}

function typoProtect(text, patterns) {
  const stash = [];
  let masked = text;
  for (const re of patterns) {
    masked = masked.replace(re, m => {
      stash.push(m);
      return `\x00${stash.length - 1}\x00`;
    });
  }
  masked = typo(masked);
  let out = masked;
  let prev;
  do {
    prev = out;
    out = out.replace(/\x00(\d+)\x00/g, (_, i) => stash[Number(i)]);
  } while (out !== prev && /\x00\d+\x00/.test(out));
  return out;
}

// .astro: защищаем frontmatter (--- ... ---), <script>, <style>; типографим остальное.
function processAstro(text) {
  let head = "";
  let body = text;
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      const fmEnd = end + 4;
      head = text.slice(0, fmEnd);
      body = text.slice(fmEnd);
    }
  }
  const processed = typoProtect(body, [/<(script|style)\b[\s\S]*?<\/\1>/gi]);
  return head + processed;
}

// .ts: типографим только внутри строковых литералов.
const reStringLiteral = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
function processTs(text) {
  return text.replace(reStringLiteral, (_m, q, inner) => q + typo(inner) + q);
}

function walk(dir, test, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, test, acc);
    else if (test(full)) acc.push(full);
  }
  return acc;
}

const astroFiles = walk(path.join(ROOT, "src"), f => f.endsWith(".astro"), []).map(f => [f, processAstro]);
const tsFiles = walk(path.join(ROOT, "src/data"), f => f.endsWith(".ts"), []).map(f => [f, processTs]);

const countNbsp = s => (s.match(/ /g) || []).length;
let changed = 0;
for (const [file, fn] of [...astroFiles, ...tsFiles]) {
  const original = fs.readFileSync(file, "utf8");
  const updated = fn(original);
  if (updated !== original) {
    changed++;
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (DRY) console.log(`  would change  ${rel}  (+${countNbsp(updated) - countNbsp(original)} nbsp)`);
    else {
      fs.writeFileSync(file, updated);
      console.log(`  updated  ${rel}`);
    }
  }
}
console.log(`\n${DRY ? "[dry] to change" : "changed"}: ${changed}`);
