const fs = require('fs');
const cheerio = require('cheerio');

async function scrape() {
  const url = "https://www.rehabhero.ca/exercise/category/Stretch";
  console.log("Fetching " + url);
  const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await resp.text();
  const $ = cheerio.load(html);

  const exercises = [];
  $('a[href^="/exercise/"]').each((i, el) => {
    const href = $(el).attr('href');
    const title = $(el).text().trim();
    if (!title || ['read more', 'older posts', 'newer posts'].includes(title.toLowerCase())) return;
    if (href.includes('category') || href.includes('tag') || href.includes('author')) return;

    if (!exercises.find(e => e.url === "https://www.rehabhero.ca" + href)) {
      exercises.push({
        id: href.split("/").pop(),
        title: title,
        url: "https://www.rehabhero.ca" + href
      });
    }
  });

  console.log(`Found ${exercises.length} stretching exercises on the main page. Fetching details...`);

  // We'll just fetch the first 15 to prevent long scraping times.
  const toFetch = exercises.slice(0, 15);
  const detailedExercises = [];

  for (const ex of toFetch) {
    try {
      console.log("Fetching details for " + ex.title);
      const exResp = await fetch(ex.url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const exHtml = await exResp.text();
      const ex$ = cheerio.load(exHtml);

      const description = ex$('.sqs-block-html p').first().text().trim() || "";
      
      // Try to find the iframe source for video
      let videoUrl = ex$('iframe').attr('src');
      if (videoUrl && videoUrl.startsWith('//')) {
          videoUrl = "https:" + videoUrl;
      }
      
      // Try to find categories/tags
      const tags = [];
      ex$('a[href^="/exercise/category/"], a[href^="/exercise/tag/"]').each((i, el) => {
         const t = ex$(el).text().trim();
         if (t && !tags.includes(t)) tags.push(t);
      });

      detailedExercises.push({
        id: ex.id,
        title: ex.title,
        description: description,
        videoUrl: videoUrl,
        categories: tags
      });
    } catch(err) {
      console.log("Failed to fetch " + ex.url, err.message);
    }
  }

  // Save to src/data/stretching_data.json
  if (!fs.existsSync('./src/data')) {
    fs.mkdirSync('./src/data');
  }
  fs.writeFileSync('./src/data/stretching_data.json', JSON.stringify(detailedExercises, null, 2));
  console.log("Scraping finished. Wrote to src/data/stretching_data.json");
}

scrape();
