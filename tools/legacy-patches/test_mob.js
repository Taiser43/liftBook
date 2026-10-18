const cheerio = require('cheerio');

async function test() {
  const url = "https://www.rehabhero.ca/exercise/category/Mobility";
  const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await resp.text();
  const $ = cheerio.load(html);
  
  let count = 0;
  $('a[href^="/exercise/"]').each((i, el) => {
    const title = $(el).text().trim();
    if (!title || ['read more', 'older posts', 'newer posts'].includes(title.toLowerCase())) return;
    count++;
  });
  console.log("Mobility count:", count);
}
test();
