const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'mattis-website');

const modules = [
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/rolldown-runtime.Dh6celcD.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/react.CWOg5Z1e.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/motion.B5UonZQE.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/framer.DN-cLJEY.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/CoreVideo.BPyvH8Pa.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/shared-lib.DkEkkZ-v.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/bNQojwmY8.BN59QLQ9.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/bQgYVRr2r.7RI7h3QX.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/q3Vjyf2CJ.B99t3oC9.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/jN65l0nPn.BvLUfAzh.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/MY9fowtvO.DP_nqCS8.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/wUbkgpTix.D5_sVqjK.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/QXBZhNqOO.vf69irQq.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/afEAQbSGU.CmimH8sc.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/Zx3cqktX4.BWRE7j-m.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/P7Adl9hjg1yhSfhbfhLsBA-UlWLVcMhoPhpA-Sqjb10.Bhi_tJJB.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/GradientWave.DOmo5cr_.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/nt6b8yLkm.Br3bUE8z.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/azacNkTLX.DxbWU7Kv.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/bwyfkL81Q.CgycKPX9.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/sfCp579wJ.CP4f0Bkr.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/ekTJrSD8C.D6SPOJGm.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/Counter.Byk_F3Fa.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/OPzoxuR3B.Bs_AUMvW.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/umfgy0JC6.CMe_FRZX.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/eBhaUhXwb.B8_jGoC_.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/JeCklHRzV.DKZItZZo.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/tlL3XKKsn.7XJTUsJZ.mjs',
  'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/Kbnga1QWxY7z_AhCHDYd8xzVUzjGcrTrlRme63wh_jU.Csmk8GWH.mjs',
  'https://framer.com/edit/init.mjs',
  'https://framer.com/bootstrap.c9b39497c4dddd2d857b04d260e648d4051a9729.js',
  'https://app.framerstatic.com/chunk-GL6GZPCT.mjs',
  'https://app.framerstatic.com/chunk-GTVAZXXQ.mjs',
  'https://app.framerstatic.com/chunk-HMF7T2NG.mjs',
  'https://app.framerstatic.com/chunk-2F5FSM3K.mjs',
  'https://app.framerstatic.com/chunk-4PTFRIXN.mjs',
  'https://app.framerstatic.com/editorbar.2S5O4B2S.mjs',
];

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const size = parseInt(response.headers['content-length'] || '0');
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('OK: ' + path.basename(filepath) + ' (' + (size / 1024).toFixed(1) + ' KB)');
          resolve(filepath);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlink(filepath, () => {});
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlink(filepath, () => {});
        reject(new Error('HTTP ' + response.statusCode));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

(async () => {
  console.log('Downloading all JS modules...\n');
  
  const chunksDir = path.join(OUTPUT_DIR, '_next', 'static', 'chunks');
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }
  
  let downloaded = 0;
  
  for (const url of modules) {
    try {
      const filename = path.basename(new URL(url).pathname);
      const filepath = path.join(chunksDir, filename);
      await downloadFile(url, filepath);
      downloaded++;
    } catch (error) {
      console.log('FAILED: ' + path.basename(new URL(url).pathname));
    }
  }
  
  console.log('\nDownloaded ' + downloaded + '/' + modules.length + ' modules');
  console.log('Now update HTML to use local paths...');
})();