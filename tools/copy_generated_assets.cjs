const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\hasha\\.gemini\\antigravity-ide\\brain\\a512a994-67ce-4ea2-b877-71645c453070';
const assetsDir = path.join(__dirname, '..', 'src', 'assets');
const publicDir = path.join(__dirname, '..', 'public');

const files = [
  { src: 'bg_road_new_1786805113245.jpg', dest: path.join(assetsDir, 'bg_road.webp') },
  { src: 'bg_garage_clean_1786805205802.jpg', dest: path.join(assetsDir, 'bg_garage.webp') },
  { src: 'bg_night_new_1786805228581.jpg', dest: path.join(assetsDir, 'bg_night.webp') },
  { src: 'bg_train_new_1786805247109.jpg', dest: path.join(assetsDir, 'bg_train.webp') },
  { src: 'bg_puzzle_new_1786805265392.jpg', dest: path.join(assetsDir, 'bg_puzzle.webp') },
  // App icons
  { src: 'app_icon_new_1786805289921.jpg', dest: path.join(publicDir, 'app_icon.png') },
  { src: 'app_icon_new_1786805289921.jpg', dest: path.join(publicDir, 'pwa-512x512.png') },
  { src: 'app_icon_new_1786805289921.jpg', dest: path.join(publicDir, 'pwa-maskable-512x512.png') },
  { src: 'app_icon_new_1786805289921.jpg', dest: path.join(publicDir, 'pwa-192x192.png') },
];

for (const { src, dest } of files) {
  const fullSrc = path.join(brainDir, src);
  if (fs.existsSync(fullSrc)) {
    fs.copyFileSync(fullSrc, dest);
    console.log(`Copied ${src} -> ${dest}`);
  } else {
    console.error(`Source not found: ${fullSrc}`);
  }
}
