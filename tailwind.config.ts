import type { Config } from 'tailwindcss'

// In Tailwind v4, theme configuration lives in src/styles/globals.css via @theme.
// This file is only kept for compatibility; content detection is automatic in v4.
const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}

export default config
