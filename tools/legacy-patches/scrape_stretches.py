import requests
from bs4 import BeautifulSoup
import json
import re

url = "https://www.rehabhero.ca/exercise/category/Stretch"
headers = {"User-Agent": "Mozilla/5.0"}
resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.text, 'html.parser')

exercises = []
for a in soup.select('a[href^="/exercise/"]'):
    href = a['href']
    title = a.get_text(strip=True)
    if not title or title.lower() in ['read more', 'older posts', 'newer posts']:
        continue
    # avoid category links
    if 'category' in href or 'tag' in href or 'author' in href:
        continue
    
    # ensure uniqueness
    if not any(ex['url'] == f"https://www.rehabhero.ca{href}" for ex in exercises):
        exercises.append({
            "id": href.split("/")[-1],
            "title": title,
            "url": f"https://www.rehabhero.ca{href}"
        })

print(f"Found {len(exercises)} stretching exercises on first page.")
with open('stretching_data.json', 'w') as f:
    json.dump(exercises, f, indent=2)
