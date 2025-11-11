#!/bin/bash

# remove old ffmpeg if exists
if ls ffmpeg* 1> /dev/null 2>&1; then
    rm ffmpeg*
fi
# make sure curl is installed
if ! command -V curl > /dev/null 2>&1; then
    echo "curl is not found, please install it and try again"
    exit
fi

# download ffmpeg in the current dir (app root) from my repo (dev setup only)
curl -SL --progress-bar "https://github.com/mohamed7-dev/built-ffmpeg/releases/download/V6/ffmpeg-linux-amd64" -o ffmpeg

# make ffmpeg executable
chmod +x ffmpeg

