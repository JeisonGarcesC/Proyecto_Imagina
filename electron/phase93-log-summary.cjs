const fs = require('node:fs');
const path = require('node:path');
for (const line of fs.readFileSync(path.join(__dirname, '..', '.phase93-validation.log'), 'utf8').split(/\r?\n/)) {
  if (!line.startsWith('DRAG ')) continue;
  const row = JSON.parse(line.slice(5));
  console.log(JSON.stringify({mm: row.mm, candidate: row.preview.candidate,
    sourcePosition: row.preview.sourcePosition,
    markers: row.preview.markers.map(marker => ({visible: marker.visible, origin: marker.origin,
      destination: marker.destination, color: marker.color})),
    connections: row.connectionCount, position: row.transforms.at(-1).position}));
}
