const fs = require('fs');
const data = require('./src/data/stretching_data.json');

const cleaned = data.map(ex => {
  // Try to stop at "Related Conditions:" or "Structures Involved:" or "Exercise videos"
  let desc = ex.description;
  const cutoffWords = ['Related Conditions:', 'Exercise videos', 'STAY UPDATED', '#block-'];
  let earliestCutoff = desc.length;
  for (const word of cutoffWords) {
    const idx = desc.indexOf(word);
    if (idx !== -1 && idx < earliestCutoff) earliestCutoff = idx;
  }
  
  desc = desc.substring(0, earliestCutoff).trim();
  // Remove CSS/JS garbage
  desc = desc.replace(/\{.*?\}/gs, '').replace(/@media.*?\{/gs, '').trim();
  
  if (desc.length > 800) {
     desc = desc.substring(0, 800) + '...';
  }

  return {
    ...ex,
    description: desc
  };
});

fs.writeFileSync('./src/data/stretching_data.json', JSON.stringify(cleaned, null, 2));
console.log("Cleaned JSON length:", JSON.stringify(cleaned).length);
