const https = require('https');

https.get('https://de.openfoodfacts.org/cgi/search.pl?search_terms=D%C3%B6ner&action=process&json=1&page_size=5', {
  headers: { 'User-Agent': 'PTNutritionApp/1.0' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(json.products.map(p => p.product_name));
    } catch (e) {
      console.log("Error or HTML", data.substring(0, 100));
    }
  });
});
