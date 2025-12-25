#!/usr/bin/env node

/**
 * Test script to demonstrate ffmpeg downloading functionality
 * Run with: tsx test-ffmpeg-download.ts
 */

import { FfmpegDownloader } from '../src/main/ffmpeg/ffmpeg-downloader'
import fs from 'fs'

async function testDownload(): Promise<void> {
  console.log('Testing ffmpeg downloader...\n')

  // Show platform/architecture information
  const platformInfo = FfmpegDownloader.getPlatformInfo()
  console.log('Platform Information:')
  console.log(`  OS: ${platformInfo.platformName}`)
  console.log(`  Architecture: ${platformInfo.archName} (${platformInfo.description})`)
  console.log(`  Supported: ${platformInfo.isSupported ? '✓ Yes' : '✗ No'}\n`)

  if (!platformInfo.isSupported) {
    console.error('✗ Current platform/architecture is not supported!')
    process.exit(1)
  }

  // Get the default path
  const ffmpegPath = await FfmpegDownloader.getDefaultPath('./bin')
  console.log(`Target path: ${ffmpegPath}`)

  // Check if it already exists
  if (fs.existsSync(ffmpegPath)) {
    console.log('✓ ffmpeg already exists at the default location')
    const stats = fs.statSync(ffmpegPath)
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  Modified: ${stats.mtime.toLocaleString()}`)
    return
  }

  // Download it
  console.log('Downloading ffmpeg...')
  console.log(`URL: ${FfmpegDownloader.getDownloadUrl()}\n`)

  try {
    await FfmpegDownloader.downloadFfmpeg(ffmpegPath, (downloaded, total) => {
      const percent = Math.round((downloaded / total) * 100)
      const downloadedMB = (downloaded / 1024 / 1024).toFixed(2)
      const totalMB = (total / 1024 / 1024).toFixed(2)

      // Clear line and print progress
      process.stdout.write(`\r  Progress: ${percent}% (${downloadedMB} MB / ${totalMB} MB)`)
    })

    console.log('\n\n✓ Download completed successfully!')

    // Verify the file
    const stats = fs.statSync(ffmpegPath)
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  Executable: ${(stats.mode & 0o111) !== 0 ? 'Yes' : 'No'}`)
  } catch (error) {
    console.error('\n\n✗ Download failed:', (error as Error).message)
    process.exit(1)
  }
}

// Run the test
testDownload().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
