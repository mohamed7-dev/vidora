# Architecture Detection for FFmpeg Downloads

## Overview

The ffmpeg downloader now automatically detects CPU architecture (x64 vs ARM64) and downloads the appropriate binary for Linux and macOS systems.

## Supported Platforms & Architectures

### ✅ Linux

- **x64 (amd64)** - Standard Intel/AMD 64-bit systems
  - URL: `ffmpeg_linux_amd64`
- **ARM64** - ARM 64-bit systems (Raspberry Pi 4, ARM servers, etc.)
  - URL: `ffmpeg_linux_arm64`

### ✅ macOS (Darwin)

- **x64 (Intel)** - Intel-based Macs
  - URL: `ffmpeg_mac_amd64`
- **ARM64 (Apple Silicon)** - M1, M2, M3, M4 chips
  - URL: `ffmpeg_mac_arm64`

### ✅ Windows

- **x64 only** - Standard Windows systems
  - URL: `ffmpeg.exe`
  - Note: ARM64 Windows not currently supported by ffmpeg-builds repo

## How It Works

### Detection Method

Uses Node.js built-in `os.arch()` which returns:

- `'x64'` - Intel/AMD 64-bit
- `'arm64'` - ARM 64-bit
- `'arm'` - ARM 32-bit (not supported)

```javascript
const platform = os.platform() // 'linux', 'darwin', 'win32', etc.
const arch = os.arch() // 'x64', 'arm64', etc.
```

### Code Example

```javascript
const FfmpegDownloader = require('./src/ffmpeg-downloader')

// Get platform info
const info = FfmpegDownloader.getPlatformInfo()
console.log(info)
// Output on Apple Silicon Mac:
// {
//   platform: 'darwin',
//   platformName: 'macOS',
//   arch: 'arm64',
//   archName: 'ARM64',
//   description: 'Apple Silicon (M1/M2/M3)',
//   isSupported: true
// }

// Get correct download URL
const url = FfmpegDownloader.getDownloadUrl()
// Returns: https://github.com/aandrew-me/ffmpeg-builds/releases/download/v6/ffmpeg_mac_arm64
```

## Real-World Examples

### Apple Silicon Mac (M1/M2/M3)

```
Platform: macOS
Architecture: ARM64 (Apple Silicon)
URL: ffmpeg_mac_arm64
Binary Size: ~47 MB
```

### Intel Mac

```
Platform: macOS
Architecture: x64 (Intel/AMD 64-bit)
URL: ffmpeg_mac_amd64
Binary Size: ~75 MB
```

### Raspberry Pi 4/5 (Linux ARM64)

```
Platform: Linux
Architecture: ARM64 (ARM 64-bit)
URL: ffmpeg_linux_arm64
Binary Size: ~37 MB
```

### Standard Linux Desktop/Server

```
Platform: Linux
Architecture: x64 (Intel/AMD 64-bit)
URL: ffmpeg_linux_amd64
Binary Size: ~43 MB
```

### Windows PC

```
Platform: Windows
Architecture: x64 (Intel/AMD 64-bit)
URL: ffmpeg.exe
Binary Size: ~42 MB
```

## Error Handling

### Unsupported Architecture

If an unsupported architecture is detected (e.g., 32-bit ARM on Linux):

```javascript
Error: Unsupported Linux architecture: arm. Only x64 and arm64 are supported.
```

### Checking Support Programmatically

```javascript
if (!FfmpegDownloader.isArchitectureSupported()) {
  console.error('Your system is not supported!')
  // Show error to user
}
```

## Testing

Run the test script to verify detection on your system:

```bash
node test-ffmpeg-download.js
```

Output example on Linux x64:

```
Testing ffmpeg downloader...

Platform Information:
  OS: Linux
  Architecture: x64 (amd64) (Intel/AMD 64-bit)
  Supported: ✓ Yes

Target path: /home/username/.ytDownloader/ffmpeg
Downloading ffmpeg...
URL: https://github.com/aandrew-me/ffmpeg-builds/releases/download/v6/ffmpeg_linux_amd64

  Progress: 100% (43.01 MB / 43.01 MB)

✓ Download completed successfully!
  Size: 43.01 MB
  Executable: Yes
```

## Benefits

1. **Native Performance** - ARM64 users get native binaries instead of slower x64 emulation
2. **Smaller Downloads** - ARM binaries are often smaller (~37MB vs ~43MB on Linux)
3. **Future-Proof** - Ready for ARM-based systems becoming more common
4. **Automatic** - No user intervention needed, works transparently

## Comparison with Shell Scripts

### Old Shell Scripts (linux.sh, mac.sh)

- ❌ Only downloaded x64/amd64 versions
- ❌ ARM users had to manually find and download correct binary
- ❌ No architecture detection

### New JavaScript Implementation

- ✅ Automatically detects architecture
- ✅ Downloads correct binary for ARM64 and x64
- ✅ Works seamlessly across all supported architectures

## Windows ARM64 Note

Currently, the ffmpeg-builds repository doesn't provide ARM64 builds for Windows. If Windows ARM64 support is added in the future, update the `getDownloadUrl()` method:

```javascript
case "win32":
  if (arch === "arm64") {
    return `${baseUrl}/ffmpeg_windows_arm64.exe`; // When available
  } else {
    return `${baseUrl}/ffmpeg.exe`;
  }
```

## Available Binaries

From `aandrew-me/ffmpeg-builds` release v6:

| Binary Name          | Platform | Architecture  | Size  |
| -------------------- | -------- | ------------- | ----- |
| `ffmpeg.exe`         | Windows  | x64           | 42 MB |
| `ffmpeg_linux_amd64` | Linux    | x64           | 43 MB |
| `ffmpeg_linux_arm64` | Linux    | ARM64         | 37 MB |
| `ffmpeg_mac_amd64`   | macOS    | Intel (x64)   | 75 MB |
| `ffmpeg_mac_arm64`   | macOS    | Apple Silicon | 47 MB |

## API Reference

### `getDownloadUrl()`

Returns the correct download URL for current platform and architecture.

### `getPlatformInfo()`

Returns detailed information about current platform:

- `platform` - Raw platform string
- `platformName` - Human-readable platform name
- `arch` - Raw architecture string
- `archName` - Human-readable architecture name
- `description` - Detailed description
- `isSupported` - Boolean indicating if platform is supported

### `isArchitectureSupported()`

Returns `true` if current platform and architecture combination is supported.

### `getDefaultPath()`

Returns the default storage path for ffmpeg binary.
