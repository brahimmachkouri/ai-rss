// generate_rss.js  (ES modules)
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

// 2) Sélecteur global couvrant toutes les classes trouvées
const linkSelector = [
  "a.c-storiesNeonHighlightsCard_link",
  "a.c-storiesNeonBestCarousel_story",
  "a.c-storiesNeonBestCarousel_story-atlas",
  "a.c-storiesNeonLatest_story",
  "a.c-storiesNeonHighlightsLead_link"
].join(",");

// 3) Extraction
const items = [];

$(linkSelector).each((_, el) => {
  const href  = $(el).attr("href");
  let  title  = $(el).text().trim();
  if (href && title) {
    title = title
      .replace(/\s+By.+$/i, '')        // retire « By … »
      .replace(/\d{2}\/\d{2}\/\d{4}/, '') // retire dates « 06/10/2025 »
      .trim();

    const url   = href.startsWith('http') ? href : ROOT + href;
    const date  = $(el).closest('article').find('time').attr('datetime')
                  || new Date().toISOString();

    if (!items.find(i => i.url === url)) items.push({ title, url, date });
  }
});

// 4) Construction du flux RSS
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

// 5) Écriture dans /public/rss.xml
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/rss.xml", rss);
console.log(`RSS généré : ${items.length} article(s).`);
