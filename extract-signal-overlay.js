const fs = require('fs');

const file = fs.readFileSync('src/components/map/openstreet-map-helpers.tsx', 'utf8');
const lines = file.split('\n');

const getLineNum = (pattern) => lines.findIndex(l => l.includes(pattern));

// Actually, I can just use string manipulation or a simple script to extract it. Let's just create a new file from bash.
