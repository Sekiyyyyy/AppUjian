const fs = require('fs');
const path = require('path');

const logoSource = '/home/server/AppUjian/mobile/assets/images/logo.png';
const androidRes = '/home/server/AppUjian/mobile/android/app/src/main/res';
const mipmaps = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

if (!fs.existsSync(logoSource)) {
  console.error('Logo source not found:', logoSource);
  process.exit(1);
}

for (const mm of mipmaps) {
  const dir = path.join(androidRes, mm);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const dest = path.join(dir, 'ic_launcher.png');
  fs.copyFileSync(logoSource, dest);
  console.log('Updated:', dest);
}

console.log('Android launcher icons successfully updated with SMK logo!');
