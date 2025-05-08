const fs = require('fs');
const sharp = require('sharp');

// Create blank PNGs of different sizes
const sizes = [16, 48, 128];

sizes.forEach(size => {
    const buffer = Buffer.alloc(size * size * 4, 255); // Create buffer with white pixels
    sharp(buffer, { raw: { width: size, height: size, channels: 4 } })
        .png()
        .toFile(`icons/icon${size}.png`)
        .then(() => console.log(`Created icon${size}.png`))
        .catch(err => console.error(`Error creating icon${size}.png:`, err));
});
