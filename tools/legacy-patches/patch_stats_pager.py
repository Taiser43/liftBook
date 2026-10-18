import re

with open('src/screens/StatsScreen.tsx', 'r') as f:
    code = f.read()

pattern = r'// Chart Data\s*const chartLabels = stats\.history\.slice\(-6\)\.map\(h => \{\s*// h\.date could be "YYYY-MM-DD" or just "MM-DD"\s*const dateStr = h\.date\.length > 5 \? h\.date\.substring\(5, 10\) : h\.date;\s*const parts = dateStr\.split\(\'-\'\);\s*if \(parts\.length === 2\) \{\s*return `\$\{parts\[1\]\}-\$\{parts\[0\]\}`;\s*\}\s*return dateStr;\s*\}\);\s*const chartData = stats\.history\.slice\(-6\)\.map\(h => h\.maxWeight\);'

new_logic = """
              // Chart Data
              const eDays = exerciseTimeRange === '1w' ? 7 : exerciseTimeRange === '1m' ? 30 : 365;
              const eNow = new Date().getTime();
              let eFiltered = stats.history.filter(h => {
                const hDate = h.date.length === 5 ? new Date().getFullYear() + '-' + h.date : h.date;
                return eNow - new Date(hDate).getTime() <= eDays * 24 * 60 * 60 * 1000;
              });
              
              if (eFiltered.length === 0) eFiltered = stats.history.slice(-6);
              
              const chartLabels = eFiltered.map((h, i) => {
                if (eFiltered.length > 7 && i % Math.ceil(eFiltered.length / 7) !== 0 && i !== eFiltered.length - 1) return '';
                const dateStr = h.date.length > 5 ? h.date.substring(5, 10) : h.date;
                const parts = dateStr.split('-');
                if (parts.length === 2) return `${parts[1]}-${parts[0]}`;
                return dateStr;
              });
              const chartData = eFiltered.map(h => h.maxWeight);
"""

code = re.sub(pattern, new_logic.strip(), code)

with open('src/screens/StatsScreen.tsx', 'w') as f:
    f.write(code)
