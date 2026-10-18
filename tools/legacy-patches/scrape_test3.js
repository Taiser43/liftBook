const cheerio = require('cheerio');

async function test() {
  const exResp = await fetch("https://www.rehabhero.ca/exercise/happy-baby-cradle", { headers: { "User-Agent": "Mozilla/5.0" } });
  const exHtml = await exResp.text();
  const $ = cheerio.load(exHtml);
  
  console.log("VIDEO BLOCK:");
  console.log($('.sqs-block-video').html());
}
test();
