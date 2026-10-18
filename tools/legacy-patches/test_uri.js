const fs = require('fs');

const storedUri = 'file:///var/mobile/Containers/Data/Application/A1B2/Documents/song.mp3';
const currentDocDir = 'file:///var/mobile/Containers/Data/Application/C3D4/Documents/';

// Rewrite function
function rewriteUri(uri, currentDocDir) {
  if (uri && uri.includes('/Documents/')) {
    const filename = uri.split('/Documents/').pop();
    return currentDocDir + filename;
  }
  return uri;
}

console.log(rewriteUri(storedUri, currentDocDir));
