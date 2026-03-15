/**
 * DBDle — Seed de perks
 *
 * Busca perks de survivor via dbd.tricky.lol/api/perks?role=survivor.
 * Killer perks são derivados dos slugs em characters.json (a API killer está instável).
 *
 * O ícone de cada perk segue o padrão wiki.gg:
 *   https://deadbydaylight.wiki.gg/images/{iconField}.png
 * onde iconField = último segmento do campo `image` da API.
 *
 * Uso:
 *   node seed-perks.mjs
 *
 * Output: ./perks.json
 */

import fs from "fs/promises";

// ── Fetch survivor perks from API ─────────────────────────────────────────────

async function fetchSurvivorPerks(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch("https://dbd.tricky.lol/api/perks?role=survivor", {
        headers: { "User-Agent": "DBDle-seed/1.0", "Accept": "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  ⚠  tentativa ${i + 1} falhou (${err.message}), tentando novamente...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// ── Fetch killer perk slugs from characters API ───────────────────────────────

async function fetchKillerPerkSlugs() {
  const res = await fetch("https://dbd.tricky.lol/api/characters", {
    headers: { "User-Agent": "DBDle-seed/1.0", "Accept": "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const chars = Array.isArray(data) ? data : Object.values(data);
  const killers = chars.filter(c => (c.role || "").includes("killer"));
  const slugSet = new Set();
  for (const k of killers) {
    for (const slug of (k.perks || [])) {
      if (typeof slug === "string" && slug) slugSet.add(slug);
    }
  }
  return [...slugSet];
}

// ── URL helper ────────────────────────────────────────────────────────────────

function perkIconUrl(imageField) {
  if (!imageField) return null;
  const filename = imageField.split("/").pop(); // "iconPerks_agitation"
  return `https://deadbydaylight.wiki.gg/images/${filename}.png`;
}

// Converts a perk slug/name to the iconPerks_ URL pattern
// "Agitation" -> "https://deadbydaylight.wiki.gg/images/iconPerks_agitation.png"
// "Hex_Ruin"  -> "https://deadbydaylight.wiki.gg/images/iconPerks_hexRuin.png"
function perkIconUrlFromSlug(slug) {
  // Convert "Snake_Case_Slug" to camelCase: "snakeCaseSlug"
  const camel = slug
    .split("_")
    .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
  return `https://deadbydaylight.wiki.gg/images/iconPerks_${camel}.png`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🎯 DBDle Perk Seed\n");

  // Survivor perks — from API
  console.log("📡 Buscando perks de survivor via API...");
  const survivorRaw = await fetchSurvivorPerks();
  const survivors = Object.entries(survivorRaw).map(([slug, p]) => ({
    id:          slug,
    name:        p.name,
    description: p.description,
    role:        "survivor",
    iconUrl:     perkIconUrl(p.image),
  }));
  console.log(`  ✅ ${survivors.length} survivor perks`);

  // Killer perks — slugs from characters API + wiki.gg icon pattern
  console.log("📡 Buscando slugs de killer perks da API de characters...");
  const killerSlugs = await fetchKillerPerkSlugs();
  console.log(`  ✅ ${killerSlugs.length} killer perk slugs encontrados`);

  // Also try to enrich with API data if available (best effort)
  let killerApiData = {};
  try {
    console.log("📡 Tentando buscar killer perks via API...");
    const res = await fetch("https://dbd.tricky.lol/api/perks?role=killer", {
      headers: { "User-Agent": "DBDle-seed/1.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(25000),
    });
    if (res.ok) {
      killerApiData = await res.json();
      console.log(`  ✅ ${Object.keys(killerApiData).length} killer perks da API`);
    }
  } catch {
    console.log("  ⚠  API killer indisponível, usando dados derivados");
  }

  const killers = killerSlugs.map(slug => {
    const apiEntry = killerApiData[slug];
    return {
      id:          slug,
      name:        apiEntry?.name ?? slug.replace(/_/g, " "),
      description: apiEntry?.description ?? "",
      role:        "killer",
      iconUrl:     apiEntry ? perkIconUrl(apiEntry.image) : perkIconUrlFromSlug(slug),
    };
  });

  const all = [...killers, ...survivors];

  console.log(`\n✅ ${killers.length} killer perks, ${survivors.length} survivor perks (${all.length} total)`);

  await fs.writeFile("./perks.json", JSON.stringify({
    generatedAt:   new Date().toISOString(),
    totalKiller:   killers.length,
    totalSurvivor: survivors.length,
    perks:         all,
  }, null, 2));

  console.log("✅ perks.json salvo!\n");
}

main().catch(err => { console.error("💥", err); process.exit(1); });
