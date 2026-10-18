const cheerio = require('cheerio');
async function test() {
  const url = "https://www.rehabhero.ca/exercise/category/Stretch";
  const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await resp.text();
  const $ = cheerio.load(html);
  const older = $('a').filter((i, el) => $(el).text().trim().toLowerCase() === 'older posts').attr('href');
  console.log("OLDER POSTS LINK:", older);
}
test();
