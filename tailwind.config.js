/** @type {import('tailwindcss').Config} */
module.exports = {
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
  },
  plugins: [
    require('@tailwindcss/forms')
  ]
}