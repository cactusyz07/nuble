import { app } from 'electron'

export const APP_PATH = app.getAppPath()
export const LOGS_PATH = app.getPath('logs')
export const GAME_PATH = app.getPath('userData') + '/game/'
export const CHARACTER_IMAGES_PATH = app.getPath('userData') + '/character-images/'

// proxyconnection.touch.dofus.com DNS is gone as of 2024.
// dt-proxy-production-login is now the canonical DOFUS Touch web proxy.
export const DOFUS_ORIGIN = 'https://dt-proxy-production-login.ankama-games.com/'

// config.json is served by the production proxy and contains the live CDN base URLs
// (assetsUrl, uiUrl, dataUrl etc.). We download, cache and serve it locally
// so the game window can load it without making an outbound request that
// could be blocked.
export const REMOTE_CONFIG_URL = DOFUS_ORIGIN + 'config.json'
export const LOCAL_CONFIG_PATH = GAME_PATH + 'config.json'

// Asset map — Ankama emptied this in 2024; assets are now served directly
// from dofustouch.cdn.ankama.com. We still fetch it so the diff logic works
// but it will always be empty {"files":{},"load":[]}.
export const REMOTE_ASSET_MAP_URL = DOFUS_ORIGIN + 'assetMap.json'
export const LOCAL_ASSET_MAP_PATH = GAME_PATH + 'assetMap.json'

// Lindo-hosted game patches (fixes.js, regex.json, index.html, keymaster2.js …)
export const REMOTE_LINDO_MANIFEST_URL =
  'https://raw.githubusercontent.com/zenoxs/lindo-game-base/popup/manifest.json'
export const LOCAL_LINDO_MANIFEST_PATH = GAME_PATH + 'lindoManifest.json'

// DOFUS Touch game files manifest — now only contains 2 entries:
// build/script.js and build/styles-native.css
export const REMOTE_DOFUS_MANIFEST_URL = DOFUS_ORIGIN + 'manifest.json'
export const LOCAL_DOFUS_MANIFEST_PATH = GAME_PATH + 'manifest.json'

// Version tracking
export const LOCAL_VERSIONS_PATH = GAME_PATH + 'versions.json'
export const LOCAL_REGEX_PATH = GAME_PATH + 'regex.json'

// iTunes lookup for appVersion (still alive)
export const DOFUS_ITUNES_ORIGIN =
  'https://itunes.apple.com/lookup?id=1041406978&t=' + new Date().getTime()

// GitHub release config
export const GITHUB_OWNER = 'cactusyz07'
export const GITHUB_REPO = 'nuble'
export const GITHUB_LATEST_RELEASE_URL =
  'https://github.com/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/releases/latest'
