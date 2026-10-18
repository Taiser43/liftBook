const fs = require('fs');
let code = fs.readFileSync('src/screens/NutritionScreen.tsx', 'utf8');

const newSearchLogic = `
  const searchOnlineFood = async () => {
    if (!onlineSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      const q = encodeURIComponent(onlineSearchQuery.trim());
      
      const fetchWithRetry = async (url, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error('API Error');
            return await res.json();
          } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
      };

      const data = await fetchWithRetry(\`https://de.openfoodfacts.org/cgi/search.pl?search_terms=\${q}&search_simple=1&action=process&json=1&page_size=50\`);
      
      if (data && data.products) {
        let validProducts = data.products.filter((p: any) => 
          p.product_name && p.nutriments && (p.nutriments['energy-kcal_100g'] !== undefined || p.nutriments.energy_100g !== undefined)
        );
        
        const searchLower = onlineSearchQuery.trim().toLowerCase();
        
        validProducts.sort((a: any, b: any) => {
          const nameA = a.product_name.toLowerCase();
          const nameB = b.product_name.toLowerCase();
          let scoreA = 2; let scoreB = 2;
          if (nameA === searchLower) scoreA = 0;
          else if (nameA.includes(searchLower)) scoreA = 1;
          if (nameB === searchLower) scoreB = 0;
          else if (nameB.includes(searchLower)) scoreB = 1;
          
          if (scoreA !== scoreB) return scoreA - scoreB;
          return nameA.length - nameB.length;
        });

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
      console.warn("OpenFoodFacts search failed:", e);
      Alert.alert('Fehler', 'Die Online-Datenbank konnte nicht erreicht werden. Bitte überprüfe deine Verbindung oder versuche es gleich noch einmal.');
    } finally {
      setIsSearching(false);
    }
  };
`;

code = code.replace(/const searchOnlineFood = async \(\) => \{[\s\S]*?setIsSearching\(false\);\n    \}\n  \};/, newSearchLogic.trim());
fs.writeFileSync('src/screens/NutritionScreen.tsx', code);
