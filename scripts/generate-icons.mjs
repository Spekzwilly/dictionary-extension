import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public', { recursive: true })

const sizes = [16, 32, 48, 128]

// Indigo "D" icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="26" fill="#6366f1"/>
  <text x="64" y="93" font-family="Georgia, 'Times New Roman', serif" font-size="82" font-weight="bold" fill="white" text-anchor="middle">D</text>
</svg>`

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`)
  console.log(`✓ icon-${size}.png`)
}
