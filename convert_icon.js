const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const { DOMParser } = require('xmldom');
const { SVGPathData } = require('svg-pathdata');

// Function to convert SVG to PNG
async function convertSvgToPng(svgPath, sizes) {
  try {
    // Read the SVG file
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    // For each size, create a PNG file
    for (const size of sizes) {
      console.log(`Creating ${size}x${size} icon...`);
      
      // Create canvas with the desired size
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Set a white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);
      
      // Parse the SVG
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const paths = svgDoc.getElementsByTagName('path');
      
      // Scale factor
      const scale = size / 700;  // Original SVG is 700x700
      
      // Apply the scale transformation to the context
      ctx.scale(scale, scale);
      
      // Draw each path
      for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const fillColor = path.getAttribute('fill');
        const pathData = path.getAttribute('d');
        
        ctx.fillStyle = fillColor;
        
        // Create a path from the SVG path data
        const p = new Path2D(pathData);
        ctx.fill(p);
      }
      
      // Save the canvas as a PNG file
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(path.join(path.dirname(svgPath), `icon${size}.png`), buffer);
      console.log(`Created icon${size}.png`);
    }
    
    console.log('All icons created successfully!');
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
  }
}

// Sizes required by Chrome Extension
const sizes = [16, 48, 128];

// Path to the SVG file
const svgPath = path.join(__dirname, 'icons', 'flower.svg');

// Convert the SVG to PNGs
convertSvgToPng(svgPath, sizes);
