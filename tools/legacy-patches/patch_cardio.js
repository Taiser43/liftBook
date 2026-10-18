const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

if (!code.includes("import { Buffer } from 'buffer';")) {
  code = code.replace(
    `import React, { useState, useEffect, useRef } from 'react';`,
    `import React, { useState, useEffect, useRef } from 'react';\nimport { Buffer } from 'buffer';`
  );
}

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
