const fs = require('fs');
const cheerio = require('cheerio');

async function scrape() {
  const url = "https://www.rehabhero.ca/exercise/category/Stretch";
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

  const detailedExercises = [];
  for (const ex of exercises) {
    try {
      const exResp = await fetch(ex.url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const exHtml = await exResp.text();
      const ex$ = cheerio.load(exHtml);

      let fullText = ex$('.sqs-block-html').text().trim();
      let description = fullText; // We can parse this later in UI

      let videoUrl = "";
      let thumbnailUrl = "";
      
      const wrapper = ex$('.sqs-video-wrapper');
      if (wrapper.length) {
        const dataHtml = wrapper.attr('data-html') || "";
        const match = dataHtml.match(/url=([^&]+)/);
        if (match) {
           videoUrl = decodeURIComponent(match[1]);
        }
        thumbnailUrl = wrapper.find('img').attr('data-src') || "";
      }

      const tags = [];
      ex$('a[href^="/exercise/category/"], a[href^="/exercise/tag/"]').each((i, el) => {
         const t = ex$(el).text().trim();
         if (t && !tags.includes(t)) tags.push(t);
      });

      if (videoUrl || thumbnailUrl) {
        detailedExercises.push({
          id: ex.id,
          title: ex.title,
          description: description,
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl,
          categories: tags
        });
      }
    } catch(err) {
      console.log("Failed " + ex.url, err.message);
    }
  }

  if (!fs.existsSync('./src/data')) fs.mkdirSync('./src/data');
  fs.writeFileSync('./src/data/stretching_data.json', JSON.stringify(detailedExercises, null, 2));
}

scrape();
