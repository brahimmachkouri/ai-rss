// generate_rss.js (ES Modules)

import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const ROOT = "https://www.cnet.com";
const URL  = `${ROOT}/ai-atlas/`;

// 1) Récupérer la page
const { data } = await axios.get(URL, {
  headers: { "User-Agent": "Mozilla/5.0 (RSS bot)" }
});
const $ = cheerio.load(data);

// 2) Sélecteur pour toutes les cartes <a>, y compris celles du carrousel
const linkSelector = [
  "a.c-storiesNeonHighlightsCard_link",
  "div.c-storiesNeonBestCarousel_story a",
  "div.c-storiesNeonBestCarousel_story-atlas a",
  "a.c-storiesNeonLatest_story",
  "a.c-storiesNeonHighlightsLead_link"
].join(",");

// Debug : combien de cartes ont été détectées ?
console.log("Debug: cartes trouvées =", $(linkSelector).length);

const items = [];

// 3) Extraction des données dans chaque <a>
$(linkSelector).each((_, el) => {
  const $a   = $(el);
  const href = $a.attr("href");
  if (!href) return;

  const url = href.startsWith("http") ? href : ROOT + href;

  // 3.a) Titre via classes dédiées
  let title = $a
    .find(".c-storiesNeonLatest_hed, .c-storiesNeonMeta_hedContent")
    .text()
    .trim();

  // Fallback : tout le texte de la balise <a>
  if (!title) {
    title = $a
      .text()
      .replace(/\s+By.+$/i, "")
      .replace(/\d{1,2}\s*(hours?|days?)\s*ago/i, "")
      .replace(/\d{2}\/\d{2}\/\d{4}/, "")
      .trim();
  }
  if (!title) return;

  // 3.b) Date : préférer datetime, sinon texte, sinon maintenant
  let date =
      $a.find(".c-storiesNeonMeta_date, .c-storiesNeonLatest_meta").attr("datetime")
    || $a.find(".c-storiesNeonMeta_date, .c-storiesNeonLatest_meta").text().trim()
    || new Date().toISOString();
  if (/ago$/i.test(date)) {
    date = new Date().toISOString();
  }

  // 3.c) Image (selon type de carte)
  let image;
  if ($a.is("a.c-storiesNeonHighlightsCard_link, a.c-storiesNeonHighlightsLead_link")) {
    image = $a.find(".c-storiesNeonHighlightsCard_media img").attr("src");
  } else if ($a.is("a.c-storiesNeonLatest_story")) {
    image = $a.find(".c-storiesNeonLatest_img img").attr("src");
  }
  if (image && image.startsWith("/")) {
    image = ROOT + image;
  }

  // 3.d) Dé-doublonnage et collecte
  if (!items.find(i => i.url === url)) {
    items.push({ title, url, date, image });
  }
});

// Debug : combien d’articles extraits ?
console.log("Debug: articles extraits =", items.length);

// 4) Génération du XML RSS
let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml("CNET – AI Atlas")}</title>
  <link>${escapeXml(URL)}</link>
  <description>${escapeXml("Flux non officiel généré par GitHub Actions")}</description>`;

for (const it of items) {
  const title = escapeXml(it.title);
  const link  = escapeXml(it.url);
  const pubDate = new Date(it.date).toUTCString();
  rss += `
  <item>
    <title>${title}</title>
    <link>${link}</link>
    <guid>${link}</guid>
    <pubDate>${pubDate}</pubDate>`;
  
  if (it.image) {
    const img = escapeXml(it.image);
    rss += `
    <enclosure url="${img}" type="image/jpeg"/>`;
  }

  rss += `
  </item>`;
}

rss += `
</channel>
</rss>`;

// 5) Écriture du fichier RSS
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/rss.xml", rss, "utf-8");

console.log(`rss.xml généré avec ${items.length} article(s), images incluses quand disponibles.`);
