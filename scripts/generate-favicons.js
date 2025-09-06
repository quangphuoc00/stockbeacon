const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Read the SVG file
const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/favicon.svg'));

// Define sizes needed for different platforms
const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  { size: 64, name: 'favicon-64x64.png' },
  { size: 128, name: 'favicon-128x128.png' },
  { size: 180, name: 'apple-touch-icon.png' }, // For iOS
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
];

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');

async function generateFavicons() {
  console.log('Generating favicons from SVG...');

  for (const { size, name } of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, name));
      
      console.log(`✓ Generated ${name}`);
    } catch (error) {
      console.error(`✗ Error generating ${name}:`, error);
    }
  }

  // Generate Safari mask icon (monochrome version)
  try {
    // For mask icon, we need a monochrome version
    const maskSvg = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 2L28.2 16.8L43 21L28.2 25.2L24 40L19.8 25.2L5 21L19.8 16.8L24 2Z" fill="black"/>
      <circle cx="24" cy="21" r="4" fill="black"/>
    </svg>`;
    
    fs.writeFileSync(path.join(publicDir, 'safari-pinned-tab.svg'), maskSvg);
    console.log('✓ Generated safari-pinned-tab.svg');
  } catch (error) {
    console.error('✗ Error generating Safari mask icon:', error);
  }

  console.log('\nFavicon generation complete!');
}

generateFavicons();
