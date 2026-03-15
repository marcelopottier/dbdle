/**
 * DBDle — Seed de personagens
 *
 * Uso:
 *   node seed-characters.mjs           # URLs externas (wiki.gg)
 *   node seed-characters.mjs --local   # URLs locais (/assets/...) — após rodar download-assets.mjs
 *
 * Output: ./characters.json
 */

import fs from "fs/promises";
import { createHash } from "crypto";

const USE_LOCAL = process.argv.includes("--local");

// ── URL helpers ───────────────────────────────────────────────────────────────

function md5Path(filename, ext = "png") {
  const fullName = `${filename}.${ext}`;
  const md5 = createHash("md5").update(fullName).digest("hex");
  return `${md5[0]}/${md5.substring(0, 2)}/${fullName}`;
}

function perkIconUrl(perkName) {
  const slug = perkName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const filename = `IconPerks_${slug}`;
  if (USE_LOCAL) return `/assets/perks/${filename}.png`;
  return `https://deadbydaylight.wiki.gg/images/${md5Path(filename)}`;
}

// ── Mapa de filenames de portrait ─────────────────────────────────────────────

// Maps normalizeKey(name) → wiki.gg portrait filename (without .png)
const PORTRAIT_FILENAMES = {
  // Killers
  trapper:       "K01_TheTrapper_Portrait",
  wraith:        "K02_TheWraith_Portrait",
  hillbilly:     "K03_TheHillbilly_Portrait",
  nurse:         "K04_TheNurse_Portrait",
  shape:         "K05_TheShape_Portrait",
  hag:           "K06_TheHag_Portrait",
  doctor:        "K07_TheDoctor_Portrait",
  huntress:      "K08_TheHuntress_Portrait",
  cannibal:      "K09_TheCannibal_Portrait",
  nightmare:     "K10_TheNightmare_Portrait",
  pig:           "K11_ThePig_Portrait",
  clown:         "K12_TheClown_Portrait",
  spirit:        "K13_TheSpirit_Portrait",
  legion:        "K14_TheLegion_Portrait",
  plague:        "K15_ThePlague_Portrait",
  ghostface:     "K16_TheGhostFace_Portrait",
  demogorgon:    "K17_TheDemogorgon_Portrait",
  oni:           "K18_TheOni_Portrait",
  deathslinger:  "K19_TheDeathslinger_Portrait",
  executioner:   "K20_TheExecutioner_Portrait",
  blight:        "K21_TheBlight_Portrait",
  twins:         "K22_TheTwins_Portrait",
  trickster:     "K23_TheTrickster_Portrait",
  nemesis:       "K24_TheNemesis_Portrait",
  cenobite:      "K25_TheCenobite_Portrait",
  artist:        "K26_TheArtist_Portrait",
  onryo:         "K27_TheOnryo_Portrait",
  onry:          "K27_TheOnryo_Portrait",
  dredge:        "K28_TheDredge_Portrait",
  mastermind:    "K29_TheMastermind_Portrait",
  knight:        "K30_TheKnight_Portrait",
  skullmerchant: "K31_TheSkullMerchant_Portrait",
  singularity:   "K32_TheSingularity_Portrait",
  xenomorph:     "K33_TheXenomorph_Portrait",
  goodguy:       "K34_TheGoodGuy_Portrait",
  unknown:       "K35_TheUnknown_Portrait",
  lich:          "K36_TheLich_Portrait",
  darklord:      "K37_TheDarkLord_Portrait",
  houndmaster:   "K38_TheHoundmaster_Portrait",
  ghoul:         "K39_TheGhoul_Portrait",
  animatronic:   "K40_TheAnimatronic_Portrait",
  krasue:        "T_UI_K41_TheKrasue_Portrait",
  first:         "T_UI_K42_TheFirst_Portrait",
  // Survivors
  dwightfairfield:     "S01_DwightFairfield_Portrait",
  megthomas:           "S02_MegThomas_Portrait",
  claudettemorel:      "S03_ClaudetteMorel_Portrait",
  jakepark:            "S04_JakePark_Portrait",
  neakarlsson:         "S05_NeaKarlsson_Portrait",
  lauriestrode:        "S06_LaurieStrode_Portrait",
  acevisconti:         "S07_AceVisconti_Portrait",
  williambilloverbeck: "S08_BillOverbeck_Portrait",
  fengmin:             "S09_FengMin_Portrait",
  davidking:           "S10_DavidKing_Portrait",
  quentinsmith:        "S11_QuentinSmith_Portrait",
  detectivetapp:       "S12_DavidTapp_Portrait",
  katedenson:          "S13_KateDenson_Portrait",
  adamfrancis:         "S14_AdamFrancis_Portrait",
  jeffjohansen:        "S15_JeffJohansen_Portrait",
  janeromero:          "S16_JaneRomero_Portrait",
  ashleyjwilliams:     "S17_AshWilliams_Portrait",
  nancywheeler:        "S18_NancyWheeler_Portrait",
  steveharrington:     "S19_SteveHarrington_Portrait",
  yuikimura:           "S20_YuiKimura_Portrait",
  zarinakassir:        "S21_ZarinaKassir_Portrait",
  cherylmason:         "S22_CherylMason_Portrait",
  felixrichter:        "S23_FelixRichter_Portrait",
  lodierakoto:         "S24_ElodieRakoto_Portrait",
  yunjinlee:           "S25_LeeYun-jin_Portrait",
  jillvalentine:       "S26_JillValentine_Portrait",
  leonskennedy:        "S27_LeonScottKennedy_Portrait",
  mikaelareid:         "S28_MikaelaReid_Portrait",
  jonahvasquez:        "S29_JonahVasquez_Portrait",
  yoichiasakawa:       "S30_YoichiAsakawa_Portrait",
  haddiekaur:          "S31_HaddieKaur_Portrait",
  adawong:             "S32_AdaWong_Portrait",
  rebeccachambers:     "S33_RebeccaChambers_Portrait",
  vittoriotoscano:     "S34_VittorioToscano_Portrait",
  thalitalyra:         "S35_ThalitaLyra_Portrait",
  renatolyra:          "S36_RenatoLyra_Portrait",
  gabrielsoma:         "S37_GabrielSoma_Portrait",
  nicolascage:         "S38_NicolasCage_Portrait",
  ellenripley:         "S39_EllenRipley_Portrait",
  alanwake:            "S40_AlanWake_Portrait",
  sableward:           "S41_SableWard_Portrait",
  thetroupe:           "S42_TheTroupe_Portrait",
  laracroft:           "S43_LaraCroft_Portrait",
  trevorbelmont:       "S44_TrevorBelmont_Portrait",
  tauriecain:          "S45_TaurieCain_Portrait",
  orelarose:           "S46_OrelaRose_Portrait",
  rickgrimes:          "S47_RickGrimes_Portrait",
  michonnegrimes:      "S48_MichonneGrimes_Portrait",
  aestriyazar:         "S42_TheTroupe_Portrait",
  veeboonyasak:        "S49_VeeBoonyasak_Portrait",
  dustinhenderson:     "S50_DustinHenderson_Portrait",
  eleven:              "S51_Eleven_Portrait",
};

// ── Atributos ─────────────────────────────────────────────────────────────────

const KILLER_ATTRIBUTES = {
  trapper:       { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "trapper",   chapter: 1,  releaseYear: 2016, origin: "original" },
  wraith:        { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "stealth",   chapter: 1,  releaseYear: 2016, origin: "original" },
  hillbilly:     { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "ranged",    chapter: 1,  releaseYear: 2016, origin: "original" },
  nurse:         { moveSpeed: 3.82, terrorRadius: 32, powerCategory: "blink",     chapter: 1,  releaseYear: 2016, origin: "original" },
  shape:         { moveSpeed: 4.6,  terrorRadius: 16, powerCategory: "stealth",   chapter: 2,  releaseYear: 2016, origin: "licensed", license: "Halloween" },
  hag:           { moveSpeed: 4.4,  terrorRadius: 24, powerCategory: "trapper",   chapter: 3,  releaseYear: 2016, origin: "original" },
  doctor:        { moveSpeed: 4.6,  terrorRadius: 40, powerCategory: "madness",   chapter: 4,  releaseYear: 2017, origin: "original" },
  huntress:      { moveSpeed: 4.6,  terrorRadius: 40, powerCategory: "ranged",    chapter: 5,  releaseYear: 2017, origin: "original" },
  cannibal:      { moveSpeed: 4.6,  terrorRadius: 24, powerCategory: "ranged",    chapter: 6,  releaseYear: 2017, origin: "licensed", license: "Texas Chain Saw" },
  nightmare:     { moveSpeed: 4.6,  terrorRadius: 40, powerCategory: "stealth",   chapter: 7,  releaseYear: 2017, origin: "licensed", license: "A Nightmare on Elm Street" },
  pig:           { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "stealth",   chapter: 8,  releaseYear: 2017, origin: "licensed", license: "Saw" },
  clown:         { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "ranged",    chapter: 9,  releaseYear: 2018, origin: "original" },
  spirit:        { moveSpeed: 4.6,  terrorRadius: 24, powerCategory: "stealth",   chapter: 10, releaseYear: 2018, origin: "original" },
  legion:        { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "frenzy",    chapter: 11, releaseYear: 2018, origin: "original" },
  plague:        { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "ranged",    chapter: 12, releaseYear: 2019, origin: "original" },
  ghostface:     { moveSpeed: 4.6,  terrorRadius: 24, powerCategory: "stealth",   chapter: 13, releaseYear: 2019, origin: "licensed", license: "Scream" },
  demogorgon:    { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "portal",    chapter: 14, releaseYear: 2019, origin: "licensed", license: "Stranger Things" },
  oni:           { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "absorb",    chapter: 15, releaseYear: 2019, origin: "original" },
  deathslinger:  { moveSpeed: 4.4,  terrorRadius: 24, powerCategory: "ranged",    chapter: 16, releaseYear: 2020, origin: "original" },
  executioner:   { moveSpeed: 4.4,  terrorRadius: 32, powerCategory: "ranged",    chapter: 17, releaseYear: 2020, origin: "licensed", license: "Silent Hill" },
  blight:        { moveSpeed: 4.6,  terrorRadius: 24, powerCategory: "rush",      chapter: 18, releaseYear: 2020, origin: "original" },
  twins:         { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "summon",    chapter: 19, releaseYear: 2020, origin: "original" },
  trickster:     { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "ranged",    chapter: 20, releaseYear: 2021, origin: "original" },
  nemesis:       { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "infection", chapter: 21, releaseYear: 2021, origin: "licensed", license: "Resident Evil" },
  cenobite:      { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "summon",    chapter: 22, releaseYear: 2021, origin: "licensed", license: "Hellraiser" },
  artist:        { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "ranged",    chapter: 23, releaseYear: 2021, origin: "original" },
  onryo:         { moveSpeed: 4.6,  terrorRadius: 16, powerCategory: "stealth",   chapter: 24, releaseYear: 2022, origin: "licensed", license: "Ringu" },
  dredge:        { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "teleport",  chapter: 25, releaseYear: 2022, origin: "original" },
  mastermind:    { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "control",   chapter: 26, releaseYear: 2022, origin: "licensed", license: "Resident Evil" },
  knight:        { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "summon",    chapter: 27, releaseYear: 2022, origin: "original" },
  skullmerchant: { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "trapper",   chapter: 28, releaseYear: 2023, origin: "original" },
  singularity:   { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "control",   chapter: 29, releaseYear: 2023, origin: "original" },
  xenomorph:     { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "stealth",   chapter: 30, releaseYear: 2023, origin: "licensed", license: "Alien" },
  goodguy:       { moveSpeed: 3.92, terrorRadius: 32, powerCategory: "stealth",   chapter: 31, releaseYear: 2023, origin: "licensed", license: "Chucky" },
  unknown:       { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "ranged",    chapter: 32, releaseYear: 2024, origin: "original" },
  lich:          { moveSpeed: 4.6,  terrorRadius: 40, powerCategory: "ranged",    chapter: 33, releaseYear: 2024, origin: "licensed", license: "Dungeons & Dragons" },
  darklord:      { moveSpeed: 4.4,  terrorRadius: 32, powerCategory: "ranged",    chapter: 34, releaseYear: 2024, origin: "licensed", license: "Castlevania" },
  houndmaster:   { moveSpeed: 4.6,  terrorRadius: 32, powerCategory: "summon",    chapter: 35, releaseYear: 2024, origin: "original" },
};

const SURVIVOR_ATTRIBUTES = {
  // Chapter 1 — base game
  dwightfairfield:      { chapter: 1,  releaseYear: 2016, difficulty: "easy" },
  megthomas:            { chapter: 1,  releaseYear: 2016, difficulty: "easy" },
  claudettemorel:       { chapter: 1,  releaseYear: 2016, difficulty: "intermediate" },
  jakepark:             { chapter: 1,  releaseYear: 2016, difficulty: "hard" },
  neakarlsson:          { chapter: 1,  releaseYear: 2016, difficulty: "hard" },
  // Chapter 2 — Halloween
  acevisconti:          { chapter: 2,  releaseYear: 2016, difficulty: "intermediate" },
  lauriestrode:         { chapter: 2,  releaseYear: 2016, difficulty: "intermediate" },
  // Chapter 4 — Left Behind
  williambilloverbeck:  { chapter: 4,  releaseYear: 2017, difficulty: "hard" },
  // Chapter 5 — A Lullaby for the Dark
  fengmin:              { chapter: 5,  releaseYear: 2017, difficulty: "hard" },
  // Chapter 6 — Of Flesh and Mud
  davidking:            { chapter: 6,  releaseYear: 2017, difficulty: "intermediate" },
  // Chapter 7 — A Nightmare on Elm Street
  quentinsmith:         { chapter: 7,  releaseYear: 2017, difficulty: "intermediate" },
  // Chapter 8 — Saw
  detectivetapp:        { chapter: 8,  releaseYear: 2017, difficulty: "hard" },
  // Chapter 9 — Shattered Bloodline
  adamfrancis:          { chapter: 9,  releaseYear: 2018, difficulty: "hard" },
  // Chapter 10 — Darkness Among Us
  jeffjohansen:         { chapter: 10, releaseYear: 2018, difficulty: "intermediate" },
  katedenson:           { chapter: 10, releaseYear: 2018, difficulty: "easy" },
  // Chapter 11 — Demise of the Faithful
  janeromero:           { chapter: 11, releaseYear: 2019, difficulty: "easy" },
  // Chapter 12 — Ghost Face / Dead by Daylight (ash)
  ashleyjwilliams:      { chapter: 12, releaseYear: 2019, difficulty: "intermediate" },
  // Chapter 13 — Stranger Things
  nancywheeler:         { chapter: 13, releaseYear: 2019, difficulty: "easy" },
  steveharrington:      { chapter: 13, releaseYear: 2019, difficulty: "easy" },
  // Chapter 14 — Cursed Legacy
  yuikimura:            { chapter: 14, releaseYear: 2019, difficulty: "hard" },
  // Chapter 15 — Chains of Hate
  zarinakassir:         { chapter: 15, releaseYear: 2020, difficulty: "hard" },
  // Chapter 16 — Silent Hill
  cherylmason:          { chapter: 16, releaseYear: 2020, difficulty: "intermediate" },
  // Chapter 17 — A Binding of Kin
  felixrichter:         { chapter: 17, releaseYear: 2020, difficulty: "intermediate" },
  // Chapter 18 — Archives / All-Kill
  lodierakoto:          { chapter: 18, releaseYear: 2020, difficulty: "hard" },
  // Chapter 19 — Portrait of a Murder
  yunjinlee:            { chapter: 19, releaseYear: 2021, difficulty: "hard" },
  // Chapter 20 — Resident Evil
  jillvalentine:        { chapter: 20, releaseYear: 2021, difficulty: "intermediate" },
  leonskennedy:         { chapter: 20, releaseYear: 2021, difficulty: "easy" },
  // Chapter 21 — Hour of the Witch
  mikaelareid:          { chapter: 21, releaseYear: 2021, difficulty: "intermediate" },
  // Chapter 22 — Portrait of a Murder pt2
  jonahvasquez:         { chapter: 22, releaseYear: 2021, difficulty: "hard" },
  // Chapter 23 — Ringu
  yoichiasakawa:        { chapter: 23, releaseYear: 2022, difficulty: "intermediate" },
  // Chapter 24 — Roots of Dread
  haddiekaur:           { chapter: 24, releaseYear: 2022, difficulty: "easy" },
  // Chapter 25 — Resident Evil: Project W
  adawong:              { chapter: 25, releaseYear: 2022, difficulty: "hard" },
  rebeccachambers:      { chapter: 25, releaseYear: 2022, difficulty: "intermediate" },
  // Chapter 26 — Forged in Fog
  vittoriotoscano:      { chapter: 26, releaseYear: 2022, difficulty: "hard" },
  // Chapter 27 — Tools of Torment
  thalitalyra:          { chapter: 27, releaseYear: 2023, difficulty: "intermediate" },
  renatolyra:           { chapter: 27, releaseYear: 2023, difficulty: "easy" },
  // Chapter 28 — End Transmission
  gabrielsoma:          { chapter: 28, releaseYear: 2023, difficulty: "intermediate" },
  // Chapter 29 — Nicolas Cage
  nicolascage:          { chapter: 29, releaseYear: 2023, difficulty: "easy" },
  // Chapter 30 — Alien
  ellenripley:          { chapter: 30, releaseYear: 2023, difficulty: "intermediate" },
  // Chapter 31 — Unknown / Sable
  sableward:            { chapter: 31, releaseYear: 2024, difficulty: "hard" },
  laracroft:            { chapter: 31, releaseYear: 2024, difficulty: "hard" },
  // Chapter 32 — Alan Wake
  alanwake:             { chapter: 32, releaseYear: 2024, difficulty: "intermediate" },
  // Chapter 33 — Dungeons & Dragons
  aestriyazar:          { chapter: 33, releaseYear: 2024, difficulty: "easy" },
  // Chapter 34 — Castlevania
  trevorbelmont:        { chapter: 34, releaseYear: 2024, difficulty: "intermediate" },
  // Chapter 35 — Houndmaster / Taurie
  tauriecain:           { chapter: 35, releaseYear: 2024, difficulty: "hard" },
  // Chapter 36 — Vecna
  orelarose:            { chapter: 36, releaseYear: 2025, difficulty: "intermediate" },
  // Chapter 37 — The Walking Dead
  rickgrimes:           { chapter: 37, releaseYear: 2025, difficulty: "easy" },
  michonnegrimes:       { chapter: 37, releaseYear: 2025, difficulty: "intermediate" },
  // Chapter 38 — Stranger Things S2
  veeboonyasak:         { chapter: 38, releaseYear: 2025, difficulty: "hard" },
  dustinhenderson:      { chapter: 38, releaseYear: 2025, difficulty: "easy" },
  eleven:               { chapter: 38, releaseYear: 2025, difficulty: "intermediate" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeKey(name = "") {
  return name.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");
}
function normalizeGender(raw = "") {
  const g = raw.toLowerCase();
  if (g === "woman" || g.includes("female")) return "female";
  if (g === "man" || g.includes("male")) return "male";
  return "nonbinary";
}
async function fetchFromTricky() {
  const res = await fetch("https://dbd.tricky.lol/api/characters", {
    headers: { "User-Agent": "DBDle-seed/1.0", "Accept": "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
function buildFromLocalMaps() {
  return [
    ...Object.entries(KILLER_ATTRIBUTES).map(([key, a]) => ({ name: key, role: "killer",   gender: "male", perks: [], ...a })),
    ...Object.entries(SURVIVOR_ATTRIBUTES).map(([key, a]) => ({ name: key, role: "survivor", gender: "male", perks: [], ...a })),
  ];
}
/**
 * Converte o path interno do jogo (UI/Icons/CharPortraits/S01_Foo_Portrait.png)
 * na URL pública da wiki.gg (/images/S01_Foo_Portrait.png).
 * Se USE_LOCAL, tenta mapear para /assets/portraits/ via PORTRAIT_FILENAMES.
 */
function resolvePortraitUrl(rawImagePath, key) {
  const pf = PORTRAIT_FILENAMES[key] ?? null;
  if (USE_LOCAL) {
    return pf ? `/assets/portraits/${pf}.png` : null;
  }
  // Prefer our curated map (correct wiki.gg filenames); fall back to raw.image
  if (pf) return `https://deadbydaylight.wiki.gg/images/${pf}.png`;
  if (!rawImagePath) return null;
  const filename = rawImagePath.split("/").pop();
  return `https://deadbydaylight.wiki.gg/images/${filename}`;
}

function transformCharacter(raw) {
  const name   = raw.name || raw.displayName || "";
  const role   = (raw.role || "").includes("killer") ? "killer" : "survivor";
  const key    = normalizeKey(name);
  const gender = normalizeGender(raw.gender || "");
  const perks  = (raw.perks || []).map(p => {
    const n = p.name || p.perkName || "";
    return { name: n, description: p.description || p.descriptionText || "", iconUrl: p.image || p.iconURL || perkIconUrl(n) };
  });
  const base = { id: key, name, role, gender, portraitUrl: resolvePortraitUrl(raw.image, key), perks };
  if (role === "killer") {
    const a = KILLER_ATTRIBUTES[key] || {};
    return { ...base, origin: a.origin ?? "original", license: a.license ?? null, chapter: a.chapter ?? null, releaseYear: a.releaseYear ?? null, moveSpeed: a.moveSpeed ?? null, terrorRadius: a.terrorRadius ?? null, powerCategory: a.powerCategory ?? null, terrorRadiusAudioUrl: null };
  }
  const a = SURVIVOR_ATTRIBUTES[key] || {};
  return { ...base, origin: "original", license: null, chapter: a.chapter ?? null, releaseYear: a.releaseYear ?? null, difficulty: a.difficulty ?? null };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const mode = USE_LOCAL ? "🗂  LOCAL (/assets/...)" : "🌐 EXTERNO (wiki.gg)";
  console.log(`\n🎭 DBDle Seed — Modo: ${mode}\n`);

  let rawData;
  try {
    console.log("📡 Buscando em dbd.tricky.lol...");
    rawData = await fetchFromTricky();
  } catch (err) {
    console.warn(`⚠  tricky.lol indisponível: ${err.message}`);
    console.log("💡 Usando mapas locais...");
    rawData = buildFromLocalMaps();
  }

  const characters = (Array.isArray(rawData) ? rawData : Object.values(rawData)).map(transformCharacter);
  const killers    = characters.filter(c => c.role === "killer");
  const survivors  = characters.filter(c => c.role === "survivor");

  console.log(`\n✅ ${characters.length} personagens (${killers.length} killers, ${survivors.length} survivors)`);

  const missing = characters.filter(c => !c.portraitUrl);
  if (missing.length) {
    console.warn(`\n⚠  Sem portrait: ${missing.map(c => c.id).join(", ")}`);
  }

  console.log("\n🔗 Amostra de URLs:");
  ["trapper", "spirit", "dwightfairfield", "cherylmason"].forEach(id => {
    const c = characters.find(x => x.id === id);
    if (c) console.log(`   ${c.name.padEnd(16)} ${c.portraitUrl}`);
  });

  await fs.writeFile("./characters.json", JSON.stringify({
    generatedAt: new Date().toISOString(),
    imageSource: USE_LOCAL ? "local" : "wiki.gg",
    totalKillers: killers.length, totalSurvivors: survivors.length,
    characters,
  }, null, 2));

  console.log("\n✅ characters.json salvo!\n");
  if (!USE_LOCAL) console.log("💡 Para usar imagens locais: node download-assets.mjs && node seed-characters.mjs --local\n");
}

main().catch(err => { console.error("💥", err); process.exit(1); });
