const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// console.log('Building Tailwind CSS...');

try {
  // Ensure output directory exists
  const outputDir = path.join(__dirname, 'zentrohomes.com', 'admin', 'css');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Build full Tailwind CSS
  execSync('npx tailwindcss -i ./src/input.css -o ./zentrohomes.com/admin/css/tailwind-full.css --minify', {
    stdio: 'inherit'
  });

  // console.log('✅ Tailwind CSS build completed successfully!');
} catch (error) {
  // console.error('❌ Tailwind CSS build failed:', error.message);
  process.exit(1);
}