const fs = require('fs');
const cheerio = require('cheerio');

async function scrape() {
  const exercises = [];
  let nextUrl = "https://www.rehabhero.ca/exercise"; // The ROOT of all exercises
  
  console.log("Gathering all exercise links...");
  while (nextUrl) {
    try {
      const resp = await fetch(nextUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      const html = await resp.text();
      const $ = cheerio.load(html);

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

      const older = $('a').filter((i, el) => $(el).text().trim().toLowerCase() === 'older posts').attr('href');
      if (older) {
         nextUrl = "https://www.rehabhero.ca" + older;
         console.log("Found another page, total links so far:", exercises.length);
      } else {
         nextUrl = null;
      }
    } catch(err) {
      console.log("Error fetching list:", err.message);
      break;
    }
  }

  console.log(`Found a total of ${exercises.length} exercises. Now fetching details concurrently...`);

  const detailedExercises = [];
  
  // Throttle concurrent requests
  const CONCURRENCY = 20;
  let index = 0;
  
  async function worker() {
    while (index < exercises.length) {
      const ex = exercises[index++];
      if (index % 50 === 0) console.log(`Progress: ${index}/${exercises.length}`);
      try {
        const exResp = await fetch(ex.url, { headers: { "User-Agent": "Mozilla/5.0" } });
        const exHtml = await exResp.text();
        const ex$ = cheerio.load(exHtml);

        let fullText = ex$('.sqs-block-html').text().trim();
        let description = fullText;

        let videoUrl = "";
        let thumbnailUrl = "";
        
        const wrapper = ex$('.sqs-video-wrapper');
        if (wrapper.length) {
          const dataHtml = wrapper.attr('data-html') || "";
          const match = dataHtml.match(/url=([^&"]+)/);
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
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }
  
  await Promise.all(workers);

  if (!fs.existsSync('./src/data')) fs.mkdirSync('./src/data');
  fs.writeFileSync('./src/data/stretching_data.json', JSON.stringify(detailedExercises, null, 2));
  console.log(`Scraping finished. Wrote ${detailedExercises.length} detailed exercises to src/data/stretching_data.json`);
}

scrape();
