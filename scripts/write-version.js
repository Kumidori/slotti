// Writes a public/version.json with the current build timestamp so the
// running client can detect when a new build has been deployed.
import fs from 'fs';
import path from 'path';

const dir = path.resolve('public');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  path.join(dir, 'version.json'),
  JSON.stringify({ ts: Date.now() }) + '\n'
);
console.log('Wrote public/version.json');
