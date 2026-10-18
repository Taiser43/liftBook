const fs = require('fs');
const p = 'src/components/PlaylistModal.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes("import { getResolvedUri }")) {
  c = c.replace("import React", "import { getResolvedUri } from '../utils/uriResolver';\nimport React");
}

c = c.replace(/source=\{\{ uri: item\.coverUri \|\| playlist\.coverUri \}\}/g, "source={{ uri: getResolvedUri(item.coverUri || playlist.coverUri) }}");
c = c.replace(/source=\{\{ uri: editCoverUri \|\| 'https:\/\//g, "source={{ uri: getResolvedUri(editCoverUri) || 'https://");

fs.writeFileSync(p, c);
console.log('Patched PlaylistModal');
