// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite utilise wa-sqlite (WebAssembly) pour fonctionner sur le web.
// Sans cette ligne, Metro ne sait pas resoudre les fichiers .wasm et le
// bundle web echoue sur "Unable to resolve ./wa-sqlite/wa-sqlite.wasm".
// Voir https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/#web-support
config.resolver.assetExts.push('wasm');

module.exports = config;
