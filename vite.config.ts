import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pwa: Plugin = {
  name: 'id-marica-pwa',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    const worker = readFileSync(new URL('./pwa/service-worker.js', import.meta.url), 'utf8')
    const publicAssets = [
      'favicon.svg', 'hero-marica.jpg', 'manifest.webmanifest',
      'icons/id-marica-180.png', 'icons/id-marica-192.png', 'icons/id-marica-512.png',
      'brand/banco-mumbuca.svg', 'brand/gov-br.png', 'brand/prefeitura-marica.png',
      'map/saude.webp', 'map/vermelhinhas.webp',
    ]
    const assets = [...Object.keys(bundle).filter((name) => name.startsWith('assets/')).sort(), ...publicAssets]
    const version = createHash('sha256')
      .update(worker)
      .update(assets.join('\n'))
      .update(readFileSync(new URL('./index.html', import.meta.url)))
    for (const asset of publicAssets) {
      version.update(readFileSync(new URL(`./public/${asset}`, import.meta.url)))
    }

    this.emitFile({
      type: 'asset',
      fileName: 'sw.js',
      source: `const PWA_VERSION = ${JSON.stringify(version.digest('hex').slice(0, 16))};\nconst PWA_ASSETS = ${JSON.stringify(assets)};\n${worker}`,
    })
  },
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), pwa],
})
