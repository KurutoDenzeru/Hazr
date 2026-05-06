const fs = require('fs');

const file = fs.readFileSync('src/components/map/openstreet-map-helpers.tsx', 'utf8');

const mapOverlayUIStart = file.indexOf('export function MapOverlayUI');
const mapOverlayUIEnd = file.lastIndexOf('  );') + 6; // end of MapOverlayUI, actually let's just find the end of file

const customMapControlsStart = file.indexOf('function CustomMapControls');
const controlButtonStart = file.indexOf('const ControlButton = React.forwardRef<HTMLButtonElement');
const controlGroupStart = file.indexOf('function ControlGroup');
const mobileDrawerHeaderStart = file.indexOf('function MobileDrawerHeader');

console.log(mapOverlayUIStart, customMapControlsStart, controlButtonStart, controlGroupStart, mobileDrawerHeaderStart);

