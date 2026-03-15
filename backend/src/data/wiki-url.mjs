/**
 * wiki-url.mjs
 *
 * Gera URLs corretas para assets da DBD Fandom Wiki.
 *
 * Como funciona:
 *   A Fandom armazena imagens em:
 *   static.wikia.nocookie.net/{wiki}/images/{MD5[0]}/{MD5[0..1]}/{filename}/revision/latest
 *
 *   O path é determinístico — MD5 do nome do arquivo.
 *   O parâmetro cb= é apenas cache buster e NÃO deve ser hardcoded,
 *   pois muda a cada upload e causa 404.
 *
 * Uso:
 *   import { wikiPortraitUrl, wikiPerkIconUrl } from './wiki-url.mjs'
 */

import { createHash } from "crypto";

const WIKI_CDN = "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images";

/**
 * Dado o nome do arquivo (sem extensão), retorna a URL CDN correta.
 * @param {string} filename  Ex: "K01_charSelect_portrait"
 * @param {string} ext       Padrão: "png"
 * @param {number|null} size Resize em px (ex: 256). null = tamanho original
 */
export function wikiImageUrl(filename, ext = "png", size = null) {
  const fullName = `${filename}.${ext}`;
  const md5      = createHash("md5").update(fullName).digest("hex");
  const dir1     = md5[0];
  const dir2     = md5.substring(0, 2);

  const base = `${WIKI_CDN}/${dir1}/${dir2}/${fullName}/revision/latest`;
  return size ? `${base}/scale-to-width-down/${size}` : base;
}

/** Portrait de personagem (thumbnail para grid/autocomplete) */
export function wikiPortraitUrl(filename, size = 256) {
  return wikiImageUrl(filename, "png", size);
}

/** Portrait em alta resolução (modo Zoom) */
export function wikiPortraitHD(filename) {
  return wikiImageUrl(filename, "png", null); // tamanho original 512×512
}

/**
 * Ícone de perk
 * Padrão da wiki: IconPerks_{slug}.png
 * Ex: "Unnerving Presence" → IconPerks_unnerving_presence
 */
export function wikiPerkIconUrl(perkName, size = 64) {
  const slug     = perkName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const filename = `IconPerks_${slug}`;
  return wikiImageUrl(filename, "png", size);
}

// ─── CLI: gera mapa completo para conferência ─────────────────────────────────
if (process.argv[1].endsWith("wiki-url.mjs")) {
  const PORTRAIT_FILENAMES = {
    trapper: "K01_charSelect_portrait", wraith: "K02_charSelect_portrait",
    hillbilly: "K03_charSelect_portrait", nurse: "K04_charSelect_portrait",
    shape: "K05_charSelect_portrait", hag: "K06_charSelect_portrait",
    doctor: "K07_charSelect_portrait", huntress: "K08_charSelect_portrait",
    cannibal: "K09_charSelect_portrait", nightmare: "K10_charSelect_portrait",
    pig: "K11_charSelect_portrait", clown: "K12_charSelect_portrait",
    spirit: "K13_charSelect_portrait", legion: "K14_charSelect_portrait",
    plague: "K15_charSelect_portrait", ghostface: "K16_charSelect_portrait",
    demogorgon: "K17_charSelect_portrait", oni: "K18_charSelect_portrait",
    deathslinger: "K19_charSelect_portrait", executioner: "K20_charSelect_portrait",
    blight: "K21_charSelect_portrait", twins: "K22_charSelect_portrait",
    trickster: "K23_charSelect_portrait", nemesis: "K24_charSelect_portrait",
    cenobite: "K25_charSelect_portrait", artist: "K26_charSelect_portrait",
    onryo: "K27_charSelect_portrait", dredge: "K28_charSelect_portrait",
    mastermind: "K29_charSelect_portrait", knight: "K30_charSelect_portrait",
    skullmerchant: "K31_charSelect_portrait", singularity: "K32_charSelect_portrait",
    xenomorph: "K33_charSelect_portrait", goodguy: "K34_charSelect_portrait",
    unknown: "K35_charSelect_portrait", lich: "K36_charSelect_portrait",
    darklord: "K37_charSelect_portrait", houndmaster: "K38_charSelect_portrait",
    dwightfairfield: "DF_charSelect_portrait", megthomas: "MT_charSelect_portrait",
    claudettemore: "CM_charSelect_portrait", jakeparker: "JP_charSelect_portrait",
    neakarlsson: "NK_charSelect_portrait", acosta: "BO_charSelect_portrait",
    lauriestrode: "LS_charSelect_portrait", billyoverbeck: "WS_charSelect_portrait",
    quentinsmith: "QS_charSelect_portrait", davidking: "DK_charSelect_portrait",
    katadenzamour: "KD_charSelect_portrait", jeffjohansen: "JJ_charSelect_portrait",
    janeromero: "JR_charSelect_portrait", ashtaylore: "AT_charSelect_portrait",
    steveharbington: "SH_charSelect_portrait", nancywheeler: "NW_charSelect_portrait",
    yuikim: "YK_charSelect_portrait", zarina: "ZH_charSelect_portrait",
    cherylmason: "CM2_charSelect_portrait", felixrichter: "FR_charSelect_portrait",
    elodiegrant: "EG_charSelect_portrait",
  };

  console.log("\n📦 URLs geradas via MD5 (sem cb= hardcoded):\n");
  for (const [key, filename] of Object.entries(PORTRAIT_FILENAMES)) {
    console.log(`  ${key.padEnd(20)} ${wikiPortraitUrl(filename)}`);
  }
}
