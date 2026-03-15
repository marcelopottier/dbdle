/**
 * DBDle — Download de assets para self-hosting
 *
 * Baixa portraits e ícones de perk da Fandom via URLs MD5 (sem cb=)
 * e salva localmente em server/src/data/assets/.
 *
 * Uso:
 *   node download-assets.mjs              # baixa tudo
 *   node download-assets.mjs --dry-run    # lista o que seria baixado
 *   node download-assets.mjs --portraits  # só portraits
 *   node download-assets.mjs --perks      # só perk icons
 *
 * Output:
 *   server/src/data/assets/portraits/{filename}.png
 *   server/src/data/assets/perks/{filename}.png
 *   server/src/data/assets/manifest.json   ← mapa filename → URL local
 */

import fs   from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

// ── Config ────────────────────────────────────────────────────────────────────

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR        = path.join(__dirname, "assets");
const PORTRAITS_DIR  = path.join(OUT_DIR, "portraits");
const PERKS_DIR      = path.join(OUT_DIR, "perks");
const MANIFEST_PATH  = path.join(OUT_DIR, "manifest.json");
const CHARS_PATH     = path.join(__dirname, "characters.json");

// Concorrência (não spammar a Fandom)
const CONCURRENCY    = 3;
const DELAY_MS       = 300;

const DRY_RUN        = process.argv.includes("--dry-run");
const ONLY_PORTRAITS = process.argv.includes("--portraits");
const ONLY_PERKS     = process.argv.includes("--perks");

// ── URL helper ────────────────────────────────────────────────────────────────

// Extrai o filename de uma URL externa
// "https://deadbydaylight.wiki.gg/images/S01_Foo_Portrait.png" → "S01_Foo_Portrait.png"
function filenameFromUrl(url) {
  return url.split("/").pop().split("?")[0];
}

const PERK_FILENAMES = [
  // ── Killer perks ──────────────────────────────────────────────────────────
  // Trapper
  "IconPerks_unnerving_presence", "IconPerks_barbecue_and_chilli", "IconPerks_agitation",
  // Wraith
  "IconPerks_predator", "IconPerks_bloodhound", "IconPerks_shadowborn",
  // Hillbilly
  "IconPerks_lightborn", "IconPerks_enduring", "IconPerks_tinkerer",
  // Nurse
  "IconPerks_a_nurses_calling", "IconPerks_thanatophobia", "IconPerks_stridor",
  // Shape
  "IconPerks_save_the_best_for_last", "IconPerks_play_with_your_food", "IconPerks_monstrous_shrine",
  // Hag
  "IconPerks_hex_ruin", "IconPerks_hex_the_third_seal", "IconPerks_hex_devour_hope",
  // Doctor
  "IconPerks_overcharge", "IconPerks_coulrophobia", "IconPerks_Monitor_Abuse",
  // Huntress
  "IconPerks_territorial_imperative", "IconPerks_beast_of_prey", "IconPerks_hex_huntress_lullaby",
  // ── Survivor perks ────────────────────────────────────────────────────────
  "IconPerks_dead_hard", "IconPerks_spine_chill", "IconPerks_borrowed_time",
  "IconPerks_decisive_strike", "IconPerks_self_care", "IconPerks_prove_thyself",
  "IconPerks_adrenaline", "IconPerks_sprint_burst", "IconPerks_urban_evasion",
  "IconPerks_resilience", "IconPerks_iron_will", "IconPerks_botany_knowledge",
  "IconPerks_windows_of_opportunity", "IconPerks_kindred", "IconPerks_we_re_gonna_live_forever",
  "IconPerks_fast_track", "IconPerks_flashbang", "IconPerks_hyperfocus",
  "IconPerks_reassurance", "IconPerks_circle_of_healing",
];

// ── Download engine ───────────────────────────────────────────────────────────

async function downloadFile(url, destPath, label) {
  // Pula se já existe
  if (existsSync(destPath)) {
    process.stdout.write(`  ⏭  ${label} (já existe)\n`);
    return { status: "skipped" };
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "DBDle-asset-downloader/1.0 (fan project, non-commercial)" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      process.stdout.write(`  ❌ ${label} [${res.status}]\n`);
      return { status: "error", code: res.status };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(destPath, buffer);
    process.stdout.write(`  ✅ ${label} (${(buffer.length / 1024).toFixed(0)}KB)\n`);
    return { status: "ok", bytes: buffer.length };
  } catch (err) {
    process.stdout.write(`  ❌ ${label} — ${err.message}\n`);
    return { status: "error", message: err.message };
  }
}

// Processa em batches para respeitar o rate limit
async function downloadBatch(items) {
  const results = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(item => item()));
    results.push(...batchResults);
    if (i + CONCURRENCY < items.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎭 DBDle Asset Downloader\n");

  if (DRY_RUN) {
    console.log("🔍 DRY RUN — nenhum arquivo será baixado\n");
  }

  // Criar diretórios
  if (!DRY_RUN) {
    mkdirSync(PORTRAITS_DIR, { recursive: true });
    mkdirSync(PERKS_DIR,     { recursive: true });
  }

  const manifest = {};
  const stats    = { ok: 0, skipped: 0, error: 0, totalBytes: 0 };

  // ── Portraits — fonte: characters.json ────────────────────────────────────
  if (!ONLY_PERKS) {
    const charData = JSON.parse(await fs.readFile(CHARS_PATH, "utf-8"));
    const portraits = charData.characters
      .filter(c => c.portraitUrl)
      .map(c => ({ name: c.name, url: c.portraitUrl, filename: filenameFromUrl(c.portraitUrl) }));

    console.log(`📸 Portraits (${portraits.length} arquivos)\n`);

    if (DRY_RUN) {
      portraits.forEach(({ name, url, filename }) => {
        console.log(`  → ${filename}`);
        console.log(`     src: ${url}`);
        console.log(`     dst: ${PORTRAITS_DIR}/${filename}`);
      });
    } else {
      const tasks = portraits.map(({ url, filename }) => async () => {
        const destPath = path.join(PORTRAITS_DIR, filename);
        const result   = await downloadFile(url, destPath, filename);

        manifest[`portrait:${filename}`] = `/assets/portraits/${filename}`;
        if (result.status === "ok")      { stats.ok++;      stats.totalBytes += result.bytes; }
        if (result.status === "skipped") { stats.skipped++; }
        if (result.status === "error")   { stats.error++;   }
        return result;
      });

      await downloadBatch(tasks);
    }
  }

  // ── Perk icons ─────────────────────────────────────────────────────────────
  if (!ONLY_PORTRAITS) {
    console.log(`\n🎯 Perk Icons (${PERK_FILENAMES.length} arquivos)\n`);

    if (DRY_RUN) {
      PERK_FILENAMES.forEach(f => {
        console.log(`  → ${f}.png`);
        console.log(`     src: ${fandomUrl(f)}`);
      });
    } else {
      const tasks = PERK_FILENAMES.map(filename => async () => {
        const url      = fandomUrl(filename);
        const destPath = path.join(PERKS_DIR, `${filename}.png`);
        const result   = await downloadFile(url, destPath, filename);

        manifest[`perk:${filename}`] = `/assets/perks/${filename}.png`;
        if (result.status === "ok")      { stats.ok++;      stats.totalBytes += result.bytes; }
        if (result.status === "skipped") { stats.skipped++; }
        if (result.status === "error")   { stats.error++;   }
        return result;
      });

      await downloadBatch(tasks);
    }
  }

  // ── Manifest + resumo ──────────────────────────────────────────────────────
  if (!DRY_RUN) {
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    console.log("\n─────────────────────────────────────────");
    console.log(`✅ Baixados:   ${stats.ok}`);
    console.log(`⏭  Pulados:    ${stats.skipped} (já existiam)`);
    console.log(`❌ Erros:      ${stats.error}`);
    console.log(`💾 Total:      ${(stats.totalBytes / 1024 / 1024).toFixed(1)}MB`);
    console.log(`📄 Manifest:   ${MANIFEST_PATH}`);

    if (stats.error > 0) {
      console.log("\n⚠  Alguns arquivos falharam. Rode novamente para tentar redownload.");
    } else {
      console.log("\n🎉 Tudo certo! Atualize o seed para usar URLs locais:");
      console.log("   node seed-characters.mjs --local\n");
    }
  }
}

main().catch(err => { console.error("💥", err); process.exit(1); });
