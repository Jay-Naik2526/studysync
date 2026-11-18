/** @type {import('tailwindcss').Config} */
// Every colour is a CSS variable (space-separated RGB channels) so the Atlas and Ledger
// themes can swap palettes with one attribute on <html>. Values live in src/index.css.
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: c('paper'),            // page canvas
        parchment: c('parchment'),    // raised panels / cards
        map: c('map'),                // inset panels, wells
        ink: { DEFAULT: c('ink'), muted: c('ink-muted'), faint: c('ink-faint') },
        sand: { DEFAULT: c('sand'), dark: c('sand-dark') },
        sage: { DEFAULT: c('sage'), dark: c('sage-dark'), pale: c('sage-pale') },
        trail: { DEFAULT: c('trail'), dark: c('trail-dark'), pale: c('trail-pale') },
        ember: { DEFAULT: c('ember'), dark: c('ember-dark'), pale: c('ember-pale') },
        danger: { DEFAULT: c('danger'), pale: c('danger-pale') },
        caution: { DEFAULT: c('caution'), pale: c('caution-pale') },
        hi: { DEFAULT: c('hi') },     // highlighter (Ledger theme)
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next"', '"Atkinson Hyperlegible"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography'),],
}
