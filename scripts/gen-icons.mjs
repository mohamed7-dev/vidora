/* eslint-disable @typescript-eslint/explicit-function-return-type */

import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'node:path'

const SRC_CANDIDATES = ['resources/icon.svg']

const OUT_DIR = 'resources/icons'
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024]

async function resolveSource() {
  for (const p of SRC_CANDIDATES) {
    try {
      await fs.access(p)
      return p
    } catch {
      // ignore
    }
  }
  throw new Error(`No base icon found. Tried: ${SRC_CANDIDATES.join(', ')}`)
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function genPngs(src, outDir) {
  for (const size of SIZES) {
    const outPng = path.join(outDir, `icon-${size}.png`)
    await sharp(src).resize(size, size, { fit: 'contain' }).png().toFile(outPng)
    console.log('wrote', outPng)
  }
}

async function main() {
  const src = await resolveSource()
  const outDir = OUT_DIR
  await ensureDir(outDir)
  await genPngs(src, outDir)

  console.log('\nDone. To use in electron-builder:')
  console.log(' - mac.icon = "resources/icons/icon-1024.png"')
  console.log(' - win.icon = "resources/icons/icon-256.png" (builder will create .ico)')
  console.log(' - linux.icon = "resources/icons"')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
