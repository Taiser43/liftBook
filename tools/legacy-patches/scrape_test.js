const cheerio = require('cheerio');

async function test() {
  const exResp = await fetch("https://www.rehabhero.ca/exercise/happy-baby-cradle", { headers: { "User-Agent": "Mozilla/5.0" } });
  const exHtml = await exResp.text();
  const $ = cheerio.load(exHtml);
  
  console.log("IFRAMES:", $('iframe').length);
  $('iframe').each((i, el) => console.log($(el).attr('src')));
  
  console.log("TEXTS:");
  console.log($('.sqs-block-html').text().substring(0, 500));
}
test();
