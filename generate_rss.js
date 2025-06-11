// generate_rss.js
import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";

(async () => {
    const url = 'https://www.cnet.com/ai-atlas/';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    let items = [];
    $('.river .assetText > a').each((i, elem) => {
        const link = $(elem).attr('href');
        const title = $(elem).text().trim();
        if (link && title) {
            items.push({
                title: title,
                url: 'https://www.cnet.com' + link,
                date: new Date().toISOString() // améliorable si tu récupères la date réelle
            });
        }
    });

    let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"><channel>
<title>CNET AI Atlas</title>
<link>${url}</link>
<description>RSS custom depuis AI Atlas</description>
`;
    items.forEach(item => {
        rss += `
  <item>
    <title>${item.title}</title>
    <link>${item.url}</link>
    <pubDate>${new Date(item.date).toUTCString()}</pubDate>
  </item>`;
    });
    rss += "\n</channel></rss>";

    // Mets le flux dans le dossier public pour GitHub Pages
    fs.mkdirSync('public', { recursive: true });
    fs.writeFileSync('public/rss.xml', rss, 'utf-8');
    console.log('rss.xml généré dans ./public/rss.xml');
})();
