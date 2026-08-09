const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'mattis-website');
const HTML_FILE = path.join(OUTPUT_DIR, 'index.html');

console.log('Updating HTML to use local modules...\n');

let html = fs.readFileSync(HTML_FILE, 'utf8');

const urlMappings = new Map([
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/rolldown-runtime.Dh6celcD.mjs', '_next/static/chunks/rolldown-runtime.Dh6celcD.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/react.CWOg5Z1e.mjs', '_next/static/chunks/react.CWOg5Z1e.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/motion.B5UonZQE.mjs', '_next/static/chunks/motion.B5UonZQE.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/framer.DN-cLJEY.mjs', '_next/static/chunks/framer.DN-cLJEY.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/CoreVideo.BPyvH8Pa.mjs', '_next/static/chunks/CoreVideo.BPyvH8Pa.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/shared-lib.DkEkkZ-v.mjs', '_next/static/chunks/shared-lib.DkEkkZ-v.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/bNQojwmY8.BN59QLQ9.mjs', '_next/static/chunks/bNQojwmY8.BN59QLQ9.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/bQgYVRr2r.7RI7h3QX.mjs', '_next/static/chunks/bQgYVRr2r.7RI7h3QX.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/q3Vjyf2CJ.B99t3oC9.mjs', '_next/static/chunks/q3Vjyf2CJ.B99t3oC9.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/jN65l0nPn.BvLUfAzh.mjs', '_next/static/chunks/jN65l0nPn.BvLUfAzh.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/MY9fowtvO.DP_nqCS8.mjs', '_next/static/chunks/MY9fowtvO.DP_nqCS8.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/wUbkgpTix.D5_sVqjK.mjs', '_next/static/chunks/wUbkgpTix.D5_sVqjK.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/QXBZhNqOO.vf69irQq.mjs', '_next/static/chunks/QXBZhNqOO.vf69irQq.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/afEAQbSGU.CmimH8sc.mjs', '_next/static/chunks/afEAQbSGU.CmimH8sc.mjs'],
  ['https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/Zx3cqktX4.BWRE7j-m.mjs', '_next/static/chunks/Zx3cqktX4.BWRE7j-m.mjs'],
]);

let replacements = 0;
const sortedUrls = Array.from(urlMappings.keys()).sort((a, b) => b.length - a.length);

for (const url of sortedUrls) {
  const localPath = urlMappings.get(url);
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedUrl, 'g');
  const matches = html.match(regex);
  if (matches) {
    html = html.replace(regex, localPath);
    replacements += matches.length;
    console.log('Replaced: ' + url.substring(0, 70));
  }
}

fs.writeFileSync(HTML_FILE, html, 'utf8');

console.log('\nUpdated ' + replacements + ' URL references');
console.log('Done! Restart server and refresh to test.');
