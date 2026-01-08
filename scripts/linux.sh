#!/bin/bash

# >> Check if curl is installed or nor
if ! command -V curl > /dev/null 2>&1; then
    echo "curl not installed, please install it and try again"
    exit
fi

wget "https://github.com/mohamed7-dev/yalla-download-deps/releases/download/v.1.0.0/linux_ffmpeg_amd64.tar.xz"
wget "https://github.com/mohamed7-dev/yalla-download-deps/releases/download/v.1.0.0/nodejs-linux-amd64" -O node
chmod +x node

tar -xf linux_ffmpeg_amd64.tar.xz
# ensure bin dir exists at app root (safe even if it already exists)
mkdir -p ../resources/bin
mv node ../resources/bin/node
mv ffmpeg_linux_amd64 ../resources/bin/ffmpeg
rm -rf linux_ffmpeg_amd64.tar.xz
cd ../resources/bin
chmod +x ffmpeg/bin/ffmpeg
chmod +x ffmpeg/bin/ffprobe
# chmod +x ffmpeg/bin/ffplay
