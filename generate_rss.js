// generate_rss.js (ES modules)
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

const ROOT = "https://www.cnet.com";
const URL  = `${ROOT}/ai-atlas/`;

const { data } = await axios.get(URL, {
  headers: { "User-Agent": "Mozilla/5.0 (RSS bot)" }
});
const $ = cheerio.load(data);

// 1) Sélecteur pour les liens aux articles
const linkSelector = [
  "a.c-storiesNeonHighlightsCard_link",
  "a.c-storiesNeonBestCarousel_story",
  "a.c-storiesNeonBestCarousel_story-atlas",
  "a.c-storiesNeonLatest_story",
  "a.c-storiesNeonHighlightsLead_link"
].join(",");

const items = [];
$(linkSelector).each((_, el) => {
  // URL
  const href = $(el).attr("href");
  if (!href) return;
  const url = href.startsWith("http") ? href : ROOT + href;

  // On cherche le container <article> parent
  const article = $(el).closest("article");

  // 2) Titre
  let title = article.find(".c-storiesNeonLatest_hed, .c-storiesNeonMeta_hedContent")
                     .text().trim();
  // Nettoyage éventuel
  title = title
    .replace(/\s+By.+$/i, "")
    .replace(/\d{2}\/\d{2}\/\d{4}/, "")
    .trim();
  if (!title) return;  // skip si vide

  // 3) Date
  // Plusieurs formats : on prend le datetime si dispo, sinon texte brut
  let date = article.find(".c-storiesNeonMeta_date, .c-storiesNeonLatest_meta")
                    .attr("datetime")
             || article.find(".c-storiesNeonMeta_date, .c-storiesNeonLatest_meta")
                       .text().trim()
             || new Date().toISOString();

  // Si date texte du type "1 day ago", on laisse tomber et on met ISO now
  if (/ago$/i.test(date)) date = new Date().toISOString();

  // Dé-doublonnage
  if (!items.find(i => i.url === url)) {
    items.push({ title, url, date });
  }
});

// 4) Génération du XML RSS
let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
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
</channel></rss>`;

// 5) Écriture
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/rss.xml", rss, "utf-8");
console.log(`RSS généré : ${items.length} article(s).`);

