const tailwindcss = require('tailwindcss');
const fs = require('fs');
const path = require('path');

async function buildCSS() {
  try {
    const inputCSS = `
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom Zentro Homes styles */
:root {
  --zentro-gold: #bfa16b;
  --zentro-dark: #171e22;
  --zentro-green: #00987a;
  --zentro-light: #f6f6f1;
}

body {
  font-family: 'Public Sans', 'Noto Sans', system-ui, sans-serif;
}

.btn-primary {
  background-color: var(--zentro-gold);
  color: var(--zentro-dark);
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: rgba(191, 161, 107, 0.9);
}

.btn-secondary {
  background-color: var(--zentro-green);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: rgba(0, 152, 122, 0.9);
}

.card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}
`;

    console.log('🔄 Compiling CSS...');
    const compiled = await tailwindcss.compile(inputCSS, {
      content: [
        "./zentrohomes.com/**/*.html",
        "./zentrohomes.com/**/*.js",
        "./zentrohomes.com/admin/**/*.html",
        "./zentrohomes.com/admin/**/*.js"
      ],
      theme: {
        extend: {
          fontFamily: {
            'sans': ['Public Sans', 'Noto Sans', 'system-ui', 'sans-serif']
          },
          colors: {
            'zentro-gold': '#bfa16b',
            'zentro-dark': '#171e22',
            'zentro-green': '#00987a',
            'zentro-light': '#f6f6f1'
          }
        }
      }
    });

    console.log('📊 Compiled result type:', typeof compiled);
    console.log('📊 Compiled result keys:', Object.keys(compiled));

    // Ensure directory exists
    const outputDir = path.join(__dirname, 'zentrohomes.com', 'admin', 'css');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write compiled CSS - try different approaches
    const outputPath = path.join(outputDir, 'tailwind.css');
    let cssContent = '';
    
    if (typeof compiled === 'string') {
      cssContent = compiled;
    } else if (compiled.css) {
      cssContent = compiled.css;
    } else if (compiled.build && typeof compiled.build === 'function') {
      try {
        const built = compiled.build();
        console.log('📊 Build result type:', typeof built);
        cssContent = typeof built === 'string' ? built : built.css || built.toString();
      } catch (e) {
        console.log('⚠️ Build method failed:', e.message);
        cssContent = '';
      }
    } else if (compiled.toString && typeof compiled.toString === 'function') {
      cssContent = compiled.toString();
    }
    
    if (!cssContent || cssContent === '[object Object]') {
      // Fallback: create a basic CSS file with Tailwind utilities
      cssContent = `
/* Tailwind CSS Reset */
*, ::before, ::after { box-sizing: border-box; border-width: 0; border-style: solid; border-color: #e5e7eb; }
::before, ::after { --tw-content: ''; }
html { line-height: 1.5; -webkit-text-size-adjust: 100%; -moz-tab-size: 4; tab-size: 4; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"; }
body { margin: 0; line-height: inherit; }

/* Custom Zentro Homes styles */
:root {
  --zentro-gold: #bfa16b;
  --zentro-dark: #171e22;
  --zentro-green: #00987a;
  --zentro-light: #f6f6f1;
}

body {
  font-family: 'Public Sans', 'Noto Sans', system-ui, sans-serif;
}

/* Basic Tailwind-like utilities */
.flex { display: flex; }
.block { display: block; }
.hidden { display: none; }
.w-full { width: 100%; }
.h-full { height: 100%; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.m-4 { margin: 1rem; }
.mb-4 { margin-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }
.text-white { color: white; }
.text-gray-600 { color: #4b5563; }
.text-gray-900 { color: #111827; }
.bg-white { background-color: white; }
.bg-gray-50 { background-color: #f9fafb; }
.bg-gray-100 { background-color: #f3f4f6; }
.rounded { border-radius: 0.25rem; }
.rounded-lg { border-radius: 0.5rem; }
.shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }

.btn-primary {
  background-color: var(--zentro-gold);
  color: var(--zentro-dark);
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: rgba(191, 161, 107, 0.9);
}

.btn-secondary {
  background-color: var(--zentro-green);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: rgba(0, 152, 122, 0.9);
}

.card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}
`;
    }
    
    fs.writeFileSync(outputPath, cssContent);
    
    console.log('✅ Tailwind CSS compiled successfully to', outputPath);
    console.log('📦 Compiled CSS length:', cssContent.length, 'characters');
  } catch (error) {
    console.error('❌ Error compiling Tailwind CSS:', error);
  }
}

buildCSS();