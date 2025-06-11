import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

const ROOT = "https://www.cnet.com";
const URL  = `${ROOT}/ai-atlas/`;

const { data } = await axios.get(URL, {
  headers: { "User-Agent": "Mozilla/5.0 (RSS bot)" }
});
const $ = cheerio.load(data);

// Debug global
console.log('Nombre d\'<article> trouvés :', $('article').length);
console.log('– Debug – Sélecteur titres :', $(' .c-storiesNeonLatest_hed, .c-storiesNeonMeta_hedContent').length);
console.log('– Debug – Sélecteur dates  :', $(' .c-storiesNeonMeta_date, .c-storiesNeonLatest_meta').length);

const items = [];
$('article').each((_, art) => {
  const $art = $(art);

  // 1) Titre
  let title = $art.find('.c-storiesNeonLatest_hed, .c-storiesNeonMeta_hedContent')
                  .text().trim();
  if (!title) return;

  // 2) Lien
  // On cherche d’abord un <a> parent du titre, sinon on prend le premier <a> dans l'article
  let href = $art.find('.c-storiesNeonLatest_hed a, .c-storiesNeonMeta_hedContent a')
                 .attr('href')
         || $art.find('a').first().attr('href');
  if (!href) return;
  const url = href.startsWith('http') ? href : ROOT + href;

  // 3) Date
  let date = $art.find('.c-storiesNeonMeta_date, .c-storiesNeonLatest_meta')
                .attr('datetime')
         || $art.find('.c-storiesNeonMeta_date, .c-storiesNeonLatest_meta')
                .text().trim()
         || new Date().toISOString();
  if (/ago$/i.test(date)) date = new Date().toISOString();

  // Dé-doublonnage
  if (!items.find(i => i.url === url)) {
    items.push({ title, url, date });
  }
});

console.log(`Debug : articles extraits = ${items.length}`);

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

fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/rss.xml", rss, "utf-8");
console.log('rss.xml généré avec', items.length, 'article(s).');
