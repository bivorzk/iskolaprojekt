#!/usr/bin/env node
/**
 * md-to-pdf.mjs
 * Converts a Markdown file to PDF using marky (for HTML) + Playwright (for PDF).
 * Mermaid diagrams, syntax highlighting, themes — all handled by marky.
 *
 * Usage:
 *   node md-to-pdf.mjs <input.md> [output.pdf] [-- ...marky flags]
 *
 * Examples:
 *   node md-to-pdf.mjs thesis.md
 *   node md-to-pdf.mjs thesis.md szakdolgozat.pdf
 *   node md-to-pdf.mjs thesis.md -- --theme air --highlight
 *   node md-to-pdf.mjs thesis.md szakdolgozat.pdf -- --all --theme sakura
 *
 * Install deps once:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * marky must be installed and on PATH:
 *   cargo install marky
 */

import { chromium }                   from "playwright";
import { execSync }                   from "child_process";
import { writeFileSync, unlinkSync,
         existsSync, readFileSync as readCss }                 from "fs";
import { resolve }                    from "path";


// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (!args.length || args[0] === "--help") {
  console.log(`
Usage: node md-to-pdf.mjs <input.md> [output.pdf] [-- ...marky flags]

Examples:
  node md-to-pdf.mjs thesis.md
  node md-to-pdf.mjs thesis.md szakdolgozat.pdf
  node md-to-pdf.mjs thesis.md -- --theme air --all
  node md-to-pdf.mjs thesis.md out.pdf -- --theme sakura --highlight
`);
  process.exit(0);
}

// Split on "--" separator
const separatorIdx = args.indexOf("--");
const ownArgs      = separatorIdx === -1 ? args : args.slice(0, separatorIdx);
const markyFlags   = separatorIdx === -1 ? []   : args.slice(separatorIdx + 1);

const mdPath  = resolve(ownArgs[0]);
const outPath = ownArgs.find(a => a.endsWith(".pdf")) ?? mdPath.replace(/\.md$/i, ".pdf");

if (!existsSync(mdPath)) {
  console.error(`❌  File not found: ${mdPath}`);
  process.exit(1);
}

// ── Check marky is available ──────────────────────────────────────────────────
try {
  execSync("marky --version", { stdio: "pipe" });
} catch {
  console.error("❌  marky not found on PATH. Install with: cargo install marky");
  process.exit(1);
}

// ── Run marky → temp HTML file ────────────────────────────────────────────────
// We use --out instead of --stdout because on Windows marky writes info/success
// logs to stdout too, which corrupts the HTML when piped.
const defaultFlags = ["--diagrams", "--highlight"];
const allFlags     = [...new Set([...defaultFlags, ...markyFlags])];
const tmpHtml      = outPath.replace(/\.pdf$/, "__marky_tmp.html");
const cmd          = `marky ${JSON.stringify(mdPath)} --out ${JSON.stringify(tmpHtml)} ${allFlags.join(" ")}`;

console.log(`📝  Running: ${cmd}`);
try {
  execSync(cmd, { encoding: "utf8", stdio: "inherit" });
} catch (err) {
  console.error("❌  marky failed:\n", err.message);
  process.exit(1);
}

import { readFileSync } from "fs";
let html = readFileSync(tmpHtml, "utf8");

// ── Inject print CSS into marky's self-contained HTML ────────────────────────
// Injected before </head> so it overrides theme styles only for layout/pagination.
const userCss = existsSync("styles.css") ? readCss("styles.css", "utf8") : "";
const printCss = `
<style>
${userCss}
  @page {
    size: A4;
    margin: 2.5cm 2cm 2.5cm 3cm; /* wider left margin for binding */
  }

  body { background: #fff !important; }

  /* Avoid breaking inside code blocks, tables, diagrams */
  pre, table, figure, .mermaid { page-break-inside: avoid; }

  /* Chapter breaks */
  h1 { page-break-before: always; }
  h1:first-of-type { page-break-before: avoid; }
  h1, h2, h3, h4 { page-break-after: avoid; }

  /* Print-friendly links */
  a { color: inherit; }
</style>
`;

html = html.replace("</head>", `${printCss}\n</head>`);

// ── Write updated HTML (with print CSS injected) back to temp file ───────────
writeFileSync(tmpHtml, html, "utf8");

// ── Playwright: open HTML → print to PDF ─────────────────────────────────────
console.log("🚀  Launching Chromium…");
const browser = await chromium.launch();
const page    = await browser.newPage();

await page.goto(`file://${resolve(tmpHtml)}`, { waitUntil: "networkidle" });

// Wait for Mermaid SVGs (marky renders them client-side)
await page.waitForFunction(() => {
  const diagrams = document.querySelectorAll(".mermaid, [class*='mermaid']");
  if (!diagrams.length) return true;
  return [...diagrams].every(d => d.querySelector("svg"));
}, { timeout: 20_000 }).catch(() => {
  console.warn("⚠️  Mermaid diagrams may not have fully rendered — continuing anyway.");
});

await page.pdf({
  path:                outPath,
  format:              "A4",
  printBackground:     true,
  displayHeaderFooter: true,
  headerTemplate:      `<div></div>`,
  footerTemplate:      `
    <div style="font-size:9px;width:100%;text-align:center;color:#888;font-family:sans-serif;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>`,
  margin: { top: "2.5cm", right: "2cm", bottom: "2.5cm", left: "3cm" },
});

await browser.close();

try { unlinkSync(tmpHtml); } catch {}

console.log(`✅  PDF saved → ${outPath}`);
