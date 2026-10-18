const cheerio = require('cheerio');

async function test() {
  const exResp = await fetch("https://www.rehabhero.ca/exercise/happy-baby-cradle", { headers: { "User-Agent": "Mozilla/5.0" } });
  const exHtml = await exResp.text();
  const $ = cheerio.load(exHtml);
  
  console.log("VIDEOS:", $('video').length);
  $('video').each((i, el) => console.log("video:", $(el).html()));
  
  console.log("SQS BLOCKS:", $('.sqs-block').map((i, el) => $(el).attr('class')).get().join('\n'));
}
test();
