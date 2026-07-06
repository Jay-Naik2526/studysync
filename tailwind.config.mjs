/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Field atlas palette — warm paper surfaces, ink text, one ember accent
        paper: '#F4EEE0',        // page canvas
        parchment: '#F9F4E6',    // raised panels / cards
        map: '#EFE7D3',          // inset panels, wells
        ink: {
          DEFAULT: '#2B2B26',    // primary text
          muted: '#7A7566',      // secondary text
          faint: '#A79E8B',      // hints, placeholders
        },
        sand: {
          DEFAULT: '#DDD3B4',    // default border
          dark: '#C9BD9C',       // hover border
        },
        sage: {
          DEFAULT: '#7C9070',    // terrain green — good / done / Basecamp AI
          dark: '#4A5A40',
          pale: '#E7ECDF',
        },
        trail: {
          DEFAULT: '#5B7C99',    // slate blue — planned / informational
          dark: '#3E566C',
          pale: '#E4EBF1',
        },
        ember: {
          DEFAULT: '#E76F51',    // safety orange — the single accent
          dark: '#A33D26',
          pale: '#F9E4DC',
        },
        danger: {
          DEFAULT: '#A93B2B',    // at risk / errors
          pale: '#F4DFD9',
        },
        caution: {
          DEFAULT: '#A8842C',    // warnings / pending
          pale: '#F3EBD3',
        },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Atkinson Hyperlegible"', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography'),],
}
