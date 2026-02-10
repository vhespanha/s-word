#!/bin/sh

# Locate HTTP retrieval binaries
curl_bin=$(command -v curl)
wget_bin=$(command -v wget)

# Prefer curl, fallback wget
if [ -n "$curl_bin" ]; then
	fetch="$curl_bin --fail -O"
elif [ -n "$wget_bin" ]; then
	fetch="$wget_bin"
else
	printf '%s\n' "no download tool found; exiting..."
	return 1
fi

[ -n "$VERSION" ] && $fetch https://dl.strem.io/server/"$VERSION"/"$BUILD"/server.js
