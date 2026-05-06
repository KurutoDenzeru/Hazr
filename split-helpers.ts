import * as fs from 'fs';

const content = fs.readFileSync('src/components/map/openstreet-map-helpers.tsx', 'utf8');

// I need to split this into:
// 1. src/components/map/utils/formatters.ts
// 2. src/components/map/overlays/signal-overlay.tsx
// 3. src/components/map/controls/map-controllers.tsx
// 4. src/components/map/controls/map-overlay-ui.tsx

console.log("Analyzing file...");
