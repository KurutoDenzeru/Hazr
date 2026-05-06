const fs = require('fs');
const content = fs.readFileSync('src/components/map/openstreet-map-helpers.tsx', 'utf8');

// I will output the file to see if I can easily use RegExp to extract components
