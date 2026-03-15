/**
 * Baixa todos os ícones de perk de perks.json usando a MediaWiki API da wiki.gg
 * para resolver as URLs corretas (com cache buster).
 *
 * Uso: node download-perk-icons.mjs
 */

import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERKS_JSON = path.join(__dirname, "perks.json");
const OUT_DIR = path.join(__dirname, "assets/perks");

mkdirSync(OUT_DIR, { recursive: true });

const { perks } = JSON.parse(await fs.readFile(PERKS_JSON, "utf-8"));

// Extract unique filenames from iconUrls in perks.json
const filenames = [...new Set(
  perks
    .filter(p => p.iconUrl)
    .map(p => p.iconUrl.split("/").pop().split("?")[0])
)];

console.log(`📦 ${filenames.length} ícones de perk para baixar\n`);

const BATCH = 50; // MediaWiki API limit per request
const CONCURRENCY = 5;
const DELAY_MS = 200;

async function resolveUrls(filenames) {
  const params = new URLSearchParams({
    action: "query",
    titles: filenames.map(f => `File:${f}`).join("|"),
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
  });
  const res = await fetch(`https://deadbydaylight.wiki.gg/api.php?${params}`, {
    headers: { "User-Agent": "DBDle-asset-downloader/1.0 (fan project, non-commercial)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`MediaWiki API error: ${res.status}`);
  const data = await res.json();

  // Build map: original filename → resolved URL
  const urlMap = {};

  // Handle normalisation mapping (e.g. underscores → spaces)
  const normalizedMap = {};
  for (const n of (data.query?.normalized ?? [])) {
    normalizedMap[n.to] = n.from.replace(/^File:/, ""); // "File:Foo bar.png" → original
  }

  for (const page of Object.values(data.query?.pages ?? {})) {
    const url = page.imageinfo?.[0]?.url;
    if (!url) continue;

    const pageTitle = page.title; // e.g. "File:IconPerks agitation.png"
    const originalTitle = normalizedMap[pageTitle]; // e.g. "IconPerks_agitation.png"
    const filenameFromTitle = pageTitle.replace(/^File:/, "").replace(/ /g, "_"); // normalise spaces → underscores

    // Map both the original and the normalised filename to the URL
    if (originalTitle) urlMap[originalTitle] = url;
    urlMap[filenameFromTitle] = url;
  }

  return urlMap;
}

async function downloadFile(url, destPath, label) {
  if (existsSync(destPath)) {
    process.stdout.write(`  ⏭  ${label} (já existe)\n`);
    return "skipped";
  }
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "DBDle-asset-downloader/1.0",
        "Referer": "https://deadbydaylight.wiki.gg/",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      process.stdout.write(`  ❌ ${label} [${res.status}]\n`);
      return "error";
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(destPath, buffer);
    process.stdout.write(`  ✅ ${label} (${(buffer.length / 1024).toFixed(0)}KB)\n`);
    return "ok";
  } catch (err) {
    process.stdout.write(`  ❌ ${label} — ${err.message}\n`);
    return "error";
  }
}

let ok = 0, skipped = 0, errors = 0;

// Process in batches (MediaWiki API limit)
for (let i = 0; i < filenames.length; i += BATCH) {
  const batch = filenames.slice(i, i + BATCH);
  const urlMap = await resolveUrls(batch);

  // Download in parallel groups
  for (let j = 0; j < batch.length; j += CONCURRENCY) {
    const group = batch.slice(j, j + CONCURRENCY);
    await Promise.all(group.map(async (filename) => {
      const url = urlMap[filename];

      if (!url) {
        process.stdout.write(`  ⚠  ${filename} — não encontrado na wiki\n`);
        errors++;
        return;
      }

      // Save with capitalised first letter to match existing convention
      const saveName = filename.charAt(0).toUpperCase() + filename.slice(1);
      const destPath = path.join(OUT_DIR, saveName);
      const result = await downloadFile(url, destPath, saveName);
      if (result === "ok") ok++;
      else if (result === "skipped") skipped++;
      else errors++;
    }));

    if (j + CONCURRENCY < batch.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  if (i + BATCH < filenames.length) {
    await new Promise(r => setTimeout(r, 500));
  }
}

console.log("\n─────────────────────────────────────────");
console.log(`✅ Baixados:  ${ok}`);
console.log(`⏭  Pulados:   ${skipped}`);
console.log(`❌ Erros:     ${errors}`);
console.log("\n✨ Pronto! O backend já serve os ícones em /assets/perks/");
