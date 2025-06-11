// generate_rss.js (ES Modules)

import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

const ROOT = "https://www.cnet.com";
const URL  = `${ROOT}/ai-atlas/`;

// 1) Récupération de la page
const { data } = await axios.get(URL, {
  headers: { "User-Agent": "Mozilla/5.0 (RSS bot)" }
});
const $ = cheerio.load(data);

// 2) Sélecteur pour toutes les “cartes” <a>
const linkSelector = [
  "a.c-storiesNeonHighlightsCard_link",
  "a.c-storiesNeonBestCarousel_story",
  "a.c-storiesNeonBestCarousel_story-atlas",
  "a.c-storiesNeonLatest_story",
  "a.c-storiesNeonHighlightsLead_link"
].join(",");

// Debug : nombre de cartes détectées
console.log("Debug: cartes trouvées =", $(linkSelector).length);
console.log('– Debug – Sélecteur titres :', $(' .c-storiesNeonLatest_hed, .c-storiesNeonMeta_hedContent').length);
console.log('– Debug – Sélecteur dates  :', $(' .c-storiesNeonMeta_date, .c-storiesNeonLatest_meta').length);

const items = [];

// 3) Boucle sur chaque carte <a>
$(linkSelector).each((_, el) => {
  const $a = $(el);
  const href = $a.attr("href");
  if (!href) return;

  // Construction de l'URL absolue
  const url = href.startsWith("http") ? href : ROOT + href;

  // 3.a) Titre via classes dédiées
  let title = $a
    .find(".c-storiesNeonLatest_hed, .c-storiesNeonMeta_hedContent")
    .text()
    .trim();

  // 3.b) Fallback : texte brut du <a> si pas de titre détecté
  if (!title) {
    title = $a
      .text()
      .replace(/\s+By.+$/i, "")             // supprime “By …”
      .replace(/\d{1,2}\s*(hours?|days?)\s*ago/i, "") // supprime “X hours/days ago”
      .replace(/\d{2}\/\d{2}\/\d{4}/, "")    // supprime dates “06/10/2025”
      .trim();
  }
  if (!title) return;

  // 3.c) Date : préférence à l'attribut datetime, sinon texte brut, sinon now
  let date = 
      $a.find(".c-storiesNeonMeta_date, .c-storiesNeonLatest_meta")
        .attr("datetime")
    || $a.find(".c-storiesNeonMeta_date, .c-storiesNeonLatest_meta")
        .text()
        .trim()
    || new Date().toISOString();

  // Si date du type “X ago”, on remplace par l'instant présent
  if (/ago$/i.test(date)) {
    date = new Date().toISOString();
  }

  // 3.d) Dé-doublonnage
  if (!items.find(i => i.url === url)) {
    items.push({ title, url, date });
  }
});

// Debug : nombre d’articles extraits
console.log("Debug: articles extraits =", items.length);

// 4) Construction du flux RSS
let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>CNET – AI Atlas</title>
  <link>${URL}</link>
  <description>Flux non officiel généré par GitHub Actions</description>`;

for (const it of items) {
  rss += `
  <item>
    <title>${it.title}</title>
    <link>${it.url}</link>
    <guid>${it.url}</guid>
    <pubDate>${new Date(it.date).toUTCString()}</pubDate>
  </item>`;
}

rss += `
</channel>
</rss>`;

// 5) Écriture du fichier dans public/rss.xml
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/rss.xml", rss, "utf-8");

console.log(`rss.xml généré avec ${items.length} article(s).`);
