const fs = require('fs');

let code = fs.readFileSync('src/screens/NutritionScreen.tsx', 'utf8');

const searchRegex = /const searchOnlineFood = async \(\) => \{[\s\S]*?^\s*\};/m;
const newSearchFunction = `const searchOnlineFood = async () => {
    if (!onlineSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      const q = encodeURIComponent(onlineSearchQuery.trim());
      // Benutze de.openfoodfacts.org für bessere deutsche Ergebnisse, 50 Ergebnisse abrufen für gutes Sortieren
      const res = await fetch(\`https://de.openfoodfacts.org/cgi/search.pl?search_terms=\${q}&search_simple=1&action=process&json=1&page_size=50\`);
      const data = await res.json();
      if (data && data.products) {
        // filter products that have a name and some basic macros
        let validProducts = data.products.filter((p: any) => 
          p.product_name && p.nutriments && (p.nutriments['energy-kcal_100g'] !== undefined || p.nutriments.energy_100g !== undefined)
        );
        
        // Lokales Sortieren für genauere/kürzere Treffer
        const searchLower = onlineSearchQuery.trim().toLowerCase();
        
        validProducts.sort((a: any, b: any) => {
          const nameA = a.product_name.toLowerCase();
          const nameB = b.product_name.toLowerCase();
          
          let scoreA = 2;
          let scoreB = 2;
          
          if (nameA === searchLower) scoreA = 0;
          else if (nameA.includes(searchLower)) scoreA = 1;
          
          if (nameB === searchLower) scoreB = 0;
          else if (nameB.includes(searchLower)) scoreB = 1;
          
          if (scoreA !== scoreB) {
            return scoreA - scoreB;
          }
          // Wenn beide gleich gut passen, nimm den kürzeren Namen (wahrscheinlich generischer)
          return nameA.length - nameB.length;
        });

        // Duplikate (gleicher Name) entfernen für saubere UI
        const seenNames = new Set();
        validProducts = validProducts.filter((p: any) => {
          const n = p.product_name.toLowerCase();
          if (seenNames.has(n)) return false;
          seenNames.add(n);
          return true;
        });

        setOnlineSearchResults(validProducts.slice(0, 30));
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to search online database.');
    } finally {
      setIsSearching(false);
    }
  };`;

code = code.replace(searchRegex, newSearchFunction);
fs.writeFileSync('src/screens/NutritionScreen.tsx', code);
console.log('Patched successfully!');
