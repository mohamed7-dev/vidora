#!/usr/bin/env node

/**
 * Test script to demonstrate ytdlp downloading functionality
 * Run with: tsx test-ytdlp-download.ts
 */

import { statSync } from 'node:fs'
import { downloadYtdlp } from '../src/main/ytdlp/download-ytdlp'

async function testDownload(): Promise<void> {
  console.log('Testing ytdlp downloader...\n')

  console.log('Downloading ytdlp...')

  try {
    await downloadYtdlp('./ytdlp-bin', (progress) => {
      // Clear line and print progress
      process.stdout.write(`\r  Progress: ${(progress * 100).toFixed(2)}%`)
    })

    console.log('\n\n✓ Download completed successfully!')

    // Verify the file
    const stats = statSync('./ytdlp-bin')
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
