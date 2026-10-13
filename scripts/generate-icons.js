import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// 1. Master Icon with Obsidian Dark Background (#12131A) matching the app & website
const masterPinkLogoSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#181922"/>
      <stop offset="100%" stop-color="#0E0F14"/>
    </linearGradient>

    <!-- Top Pill Gradient: Rich brand rose to luminous coral-pink -->
    <linearGradient id="pinkTopGrad" x1="290" y1="312" x2="770" y2="312" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#C7154B"/>
      <stop offset="48%" stop-color="#F02D63"/>
      <stop offset="100%" stop-color="#FF5A87"/>
    </linearGradient>

    <!-- Middle Pill Gradient -->
    <linearGradient id="pinkMidGrad" x1="235" y1="512" x2="615" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#A80E3D"/>
      <stop offset="46%" stop-color="#E02257"/>
      <stop offset="100%" stop-color="#FF4D7E"/>
    </linearGradient>

    <!-- Bottom Pill Gradient -->
    <linearGradient id="pinkBotGrad" x1="290" y1="712" x2="770" y2="712" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#BF1347"/>
      <stop offset="48%" stop-color="#F02D63"/>
      <stop offset="100%" stop-color="#FF386E"/>
    </linearGradient>

    <!-- Glow & Shadow -->
    <filter id="pinkGlow" x="135" y="125" width="754" height="774" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="16" stdDeviation="28" flood-color="#F02D63" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Clean Obsidian Rounded Base -->
  <rect width="1024" height="1024" rx="224" fill="url(#bgGrad)"/>
  <rect x="2" y="2" width="1020" height="1020" rx="222" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="4"/>

  <!-- Logo Pills with Subtle Neon Ambient Glow -->
  <g filter="url(#pinkGlow)">
    <!-- Top Pill -->
    <rect x="290" y="225" width="480" height="175" rx="87.5" fill="url(#pinkTopGrad)"/>

    <!-- Middle Pill -->
    <rect x="235" y="425" width="380" height="175" rx="87.5" fill="url(#pinkMidGrad)"/>

    <!-- Bottom Pill -->
    <rect x="290" y="625" width="480" height="175" rx="87.5" fill="url(#pinkBotGrad)"/>
  </g>
</svg>
`;

// 2. Foreground Emblem on Transparent Canvas (sized to 64% safe zone for Android Adaptive Icons)
const foregroundPinkLogoSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Top Pill Gradient -->
    <linearGradient id="fgPinkTopGrad" x1="290" y1="312" x2="770" y2="312" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#C7154B"/>
      <stop offset="48%" stop-color="#F02D63"/>
      <stop offset="100%" stop-color="#FF5A87"/>
    </linearGradient>

    <!-- Middle Pill Gradient -->
    <linearGradient id="fgPinkMidGrad" x1="235" y1="512" x2="615" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#A80E3D"/>
      <stop offset="46%" stop-color="#E02257"/>
      <stop offset="100%" stop-color="#FF4D7E"/>
    </linearGradient>

    <!-- Bottom Pill Gradient -->
    <linearGradient id="fgPinkBotGrad" x1="290" y1="712" x2="770" y2="712" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#BF1347"/>
      <stop offset="48%" stop-color="#F02D63"/>
      <stop offset="100%" stop-color="#FF386E"/>
    </linearGradient>

    <filter id="fgGlow" x="180" y="170" width="664" height="684" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#F02D63" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Scaled to 64% to stay safely within Android Adaptive circle (center 66dp of 108dp) -->
  <g transform="matrix(0.64 0 0 0.64 184.32 184.32)" filter="url(#fgGlow)">
    <!-- Top Pill -->
    <rect x="290" y="225" width="480" height="175" rx="87.5" fill="url(#fgPinkTopGrad)"/>

    <!-- Middle Pill -->
    <rect x="235" y="425" width="380" height="175" rx="87.5" fill="url(#fgPinkMidGrad)"/>

    <!-- Bottom Pill -->
    <rect x="290" y="625" width="480" height="175" rx="87.5" fill="url(#fgPinkBotGrad)"/>
  </g>
</svg>
`;

// 3. Clean Transparent Vector Emblem (for web & branding)
const transparentPinkLogoSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tPinkTopGrad" x1="290" y1="312" x2="770" y2="312" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#C7154B"/>
      <stop offset="48%" stop-color="#F02D63"/>
      <stop offset="100%" stop-color="#FF5A87"/>
    </linearGradient>

    <linearGradient id="tPinkMidGrad" x1="235" y1="512" x2="615" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#A80E3D"/>
      <stop offset="46%" stop-color="#E02257"/>
      <stop offset="100%" stop-color="#FF4D7E"/>
    </linearGradient>

    <linearGradient id="tPinkBotGrad" x1="290" y1="712" x2="770" y2="712" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#BF1347"/>
      <stop offset="48%" stop-color="#F02D63"/>
      <stop offset="100%" stop-color="#FF386E"/>
    </linearGradient>
  </defs>

  <!-- Top Pill -->
  <rect x="290" y="225" width="480" height="175" rx="87.5" fill="url(#tPinkTopGrad)"/>

  <!-- Middle Pill -->
  <rect x="235" y="425" width="380" height="175" rx="87.5" fill="url(#tPinkMidGrad)"/>

  <!-- Bottom Pill -->
  <rect x="290" y="625" width="480" height="175" rx="87.5" fill="url(#tPinkBotGrad)"/>
</svg>
`;

async function run() {
  console.log('Generating EazyPost website-pink gradient app icons...');
  const resDir = path.resolve('android/app/src/main/res');

  const densities = [
    { name: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { name: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { name: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { name: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { name: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
  ];

  for (const d of densities) {
    const dir = path.join(resDir, d.name);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 1. Standard square/squircle launcher icon
    await sharp(Buffer.from(masterPinkLogoSvg))
      .resize(d.size, d.size)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // 2. Round launcher icon (circular mask)
    const circleMaskSvg = `<svg width="${d.size}" height="${d.size}"><circle cx="${d.size/2}" cy="${d.size/2}" r="${d.size/2}" fill="#ffffff"/></svg>`;
    await sharp(Buffer.from(masterPinkLogoSvg))
      .resize(d.size, d.size)
      .composite([{
        input: Buffer.from(circleMaskSvg),
        blend: 'dest-in'
      }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // 3. Adaptive foreground icon
    await sharp(Buffer.from(foregroundPinkLogoSvg))
      .resize(d.fgSize, d.fgSize)
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`✓ Generated ${d.name} (${d.size}x${d.size}, fg: ${d.fgSize}x${d.fgSize})`);
  }

  // Ensure Android Adaptive Background matches the obsidian dark tone (#12131A)
  const bgXmlPath = path.join(resDir, 'values/ic_launcher_background.xml');
  fs.writeFileSync(bgXmlPath, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#12131A</color>
</resources>
`);

  // Write Web Assets to public/ and src/assets/
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const assetsDir = path.resolve('src/assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  await sharp(Buffer.from(masterPinkLogoSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  await sharp(Buffer.from(masterPinkLogoSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  await sharp(Buffer.from(masterPinkLogoSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  await sharp(Buffer.from(masterPinkLogoSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // High-res standalone transparent logo PNG
  await sharp(Buffer.from(transparentPinkLogoSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(publicDir, 'logo.png'));

  // Also save in src/assets/ for direct bundling
  await sharp(Buffer.from(transparentPinkLogoSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(assetsDir, 'logo.png'));

  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), masterPinkLogoSvg.trim());
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), transparentPinkLogoSvg.trim());
  fs.writeFileSync(path.join(assetsDir, 'logo.svg'), transparentPinkLogoSvg.trim());

  // Generate iOS AppIcon if ios directory exists
  const iosIconDir = path.resolve('ios/App/App/Assets.xcassets/AppIcon.appiconset');
  if (fs.existsSync(iosIconDir)) {
    await sharp(Buffer.from(masterPinkLogoSvg))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(iosIconDir, 'AppIcon-512@2x.png'));
    console.log('✓ Generated iOS AppIcon-512@2x.png (1024x1024)');
  }

  console.log('✓ All EazyPost pink gradient logo icons generated successfully!');
}

run().catch(console.error);
