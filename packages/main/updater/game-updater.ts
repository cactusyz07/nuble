import axios, { AxiosInstance } from 'axios'
import axiosRetryPkg, { exponentialDelay } from 'axios-retry'
import fs from 'fs-extra'
import path from 'path'
import * as beautify from 'js-beautify'
import { UpdaterWindow } from '../windows/updater-window'
import { Files, ItunesLookup, Manifest, RegexPatches } from './models'
import { DiffManifest, retrieveManifests } from './updater-utils'
import {
  DOFUS_ORIGIN,
  DOFUS_ITUNES_ORIGIN,
  GAME_PATH,
  LOCAL_CONFIG_PATH,
  LOCAL_DOFUS_MANIFEST_PATH,
  LOCAL_LINDO_MANIFEST_PATH,
  LOCAL_REGEX_PATH,
  LOCAL_VERSIONS_PATH,
  REMOTE_CONFIG_URL,
  REMOTE_DOFUS_MANIFEST_URL,
  REMOTE_LINDO_MANIFEST_URL
} from '../constants'
import { RootStore } from '@lindo/shared'
import { logger } from '../logger'
import { generateUserArgent } from '../utils'
import { Agent } from 'https'

const axiosRetry = axiosRetryPkg.default || axiosRetryPkg

interface GameVersion {
  buildVersion: string
  appVersion: string
}

/**
 * GameUpdater — 2026 edition
 *
 * Architecture change summary:
 *  - proxyconnection.touch.dofus.com is dead (DNS gone). Only earlyproxy is alive.
 *  - assetMap.json is always empty {"files":{},"load":[]}. Ankama moved all
 *    game assets to dofustouch.cdn.ankama.com, served at runtime by the game
 *    client itself.  We no longer download or locally-host game assets.
 *  - manifest.json now has exactly 2 entries: build/script.js and
 *    build/styles-native.css.  These are the only files we download.
 *  - config.json (new) is fetched from earlyproxy and cached locally.
 *    The local Express server re-serves it so the game window can GET it.
 *    It contains assetsUrl / uiUrl pointing to the CDN — we keep those
 *    unchanged so the game fetches assets directly from Ankama's CDN.
 */
export class GameUpdater {
  private readonly _updaterWindow: UpdaterWindow
  private readonly _rootStore: RootStore
  private readonly _httpClient: AxiosInstance

  private constructor(updaterWindow: UpdaterWindow, rootStore: RootStore, userAgent: string) {
    this._updaterWindow = updaterWindow
    this._rootStore = rootStore
    this._httpClient = axios.create({
      headers: {
        'User-Agent': userAgent
      },
      httpsAgent: new Agent({ keepAlive: true }),
      timeout: 30_000
    })
    axiosRetry(this._httpClient, {
      retries: 5,
      retryDelay: (retryCount) => exponentialDelay(retryCount, undefined, 1000),
      shouldResetTimeout: true,
      onRetry: (retryCount, error) => {
        logger.warn({ retryCount, error: error.toString() })
      }
    })
  }

  static async init(rootStore: RootStore): Promise<GameUpdater> {
    const updaterWindow = await UpdaterWindow.init(rootStore)
    const userAgent = await generateUserArgent(rootStore.appStore.appVersion)
    return new GameUpdater(updaterWindow, rootStore, userAgent)
  }

  async run() {
    return (async () => {
      // Ensure game directory exists
      fs.mkdirSync(GAME_PATH, { recursive: true })
      fs.mkdirSync(GAME_PATH + 'build', { recursive: true })

      // ── Step 1: Download and cache config.json ───────────────────────────
      // config.json contains the live CDN base URLs (assetsUrl, uiUrl …).
      // We cache it locally and the Express server re-serves it from /game/config.json.
      this._updaterWindow.sendProgress({ message: 'FETCHING GAME CONFIG', percent: 5 })
      await this._updateConfig()

      // ── Step 2: Diff + download lindo game-base files ────────────────────
      // Lindo hosts fixes.js, fixes.css, index.html, keymaster2.js, regex.json
      // in the lindo-game-base GitHub repo.
      this._updaterWindow.sendProgress({ message: 'CHECKING LINDO PATCHES', percent: 15 })
      const [, remoteLindoManifest, lindoDiffManifest] = await retrieveManifests({
        localManifestPath: LOCAL_LINDO_MANIFEST_PATH,
        remoteManifestUrl: REMOTE_LINDO_MANIFEST_URL,
        httpClient: this._httpClient
      })

      // ── Step 3: Diff + download DOFUS game files ─────────────────────────
      // Only 2 files in the manifest now: build/script.js + build/styles-native.css
      this._updaterWindow.sendProgress({ message: 'CHECKING GAME FILES', percent: 25 })
      const [, remoteDofusManifest, dofusDiffManifest] = await retrieveManifests({
        localManifestPath: LOCAL_DOFUS_MANIFEST_PATH,
        remoteManifestUrl: REMOTE_DOFUS_MANIFEST_URL,
        httpClient: this._httpClient
      })

      // ── Step 4: Download lindo patch files into memory ───────────────────
      this._updaterWindow.sendProgress({ message: 'DOWNLOADING LINDO PATCHES', percent: 35 })
      const missingLindoFiles = await this._downloadManifestFiles(
        lindoDiffManifest,
        remoteLindoManifest,
        REMOTE_LINDO_MANIFEST_URL.replace('/manifest.json', '/')
      )

      // ── Step 5: Download DOFUS game files (script.js + css) to disk ──────
      this._updaterWindow.sendProgress({ message: 'DOWNLOADING GAME FILES', percent: 50 })
      const missingDofusFiles = await this._downloadManifestFiles(dofusDiffManifest, remoteDofusManifest, DOFUS_ORIGIN)

      // ── Step 6: Extract build version from script.js ─────────────────────
      this._updaterWindow.sendProgress({ message: 'DETECTING GAME VERSION', percent: 70 })
      const localVersions = await this._detectVersions(missingDofusFiles)

      // ── Step 7: Apply regex patches (Lindo overrides on game files) ───────
      this._updaterWindow.sendProgress({ message: 'APPLYING LINDO PATCHES', percent: 80 })
      this._applyRegex(lindoDiffManifest, missingLindoFiles, missingDofusFiles)

      // ── Step 8: Write all files to disk ──────────────────────────────────
      this._updaterWindow.sendProgress({ message: 'SAVING FILES', percent: 90 })
      this._writeMissingFiles(missingLindoFiles)
      this._writeMissingFiles(missingDofusFiles)

      // ── Step 9: Persist manifests + versions ─────────────────────────────
      this._updaterWindow.sendProgress({ message: 'FINALISING', percent: 95 })
      await Promise.all([
        fs.promises.writeFile(LOCAL_LINDO_MANIFEST_PATH, JSON.stringify(remoteLindoManifest)),
        fs.promises.writeFile(LOCAL_DOFUS_MANIFEST_PATH, JSON.stringify(remoteDofusManifest)),
        fs.promises.writeFile(LOCAL_VERSIONS_PATH, JSON.stringify(localVersions))
      ])

      this._rootStore.appStore.setAppVersion(localVersions.appVersion)
      this._rootStore.appStore.setBuildVersion(localVersions.buildVersion)

      // ── Step 10: Patch Lindo index.html for Live compatibility ──────────
      try {
        const indexPath = GAME_PATH + 'index.html'
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, 'utf-8')
          if (!html.includes('id="dofusBody"') || !html.includes('class="dofusBody"')) {
            html = html.replace(/<body[^>]*>/i, '<body id="dofusBody" class="dofusBody">')
            fs.writeFileSync(indexPath, html)
            logger.info('GameUpdater -> Patched index.html with dofusBody id and class')
          }
        }
      } catch(e) { logger.error('GameUpdater -> failed to patch index.html: ' + e) }
    })().finally(() => {
      logger.info('GAME UPDATE FINISHED')
      this._updaterWindow.close()
    })
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Fetch config.json from earlyproxy and write it to disk so the local
   * Express server can re-serve it to the game window.
   */
  private async _updateConfig(): Promise<void> {
    try {
      const response = await this._httpClient.get(REMOTE_CONFIG_URL)
      const configData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
      await fs.promises.writeFile(LOCAL_CONFIG_PATH, configData, 'utf-8')
      logger.info('GameUpdater -> config.json cached successfully')
    } catch (error) {
      logger.warn('GameUpdater -> failed to fetch config.json, using cached version if available: ' + error)
      // Not fatal — if we have a cached version it will be served.
      if (!fs.existsSync(LOCAL_CONFIG_PATH)) {
        throw new Error('config.json not available and no cached copy exists')
      }
    }
  }

  /**
   * Download all files marked as changed (diff = 1) from a manifest.
   * Returns a Files map of filename-key → content (string).
   *
   * The lindo-game-base manifest stores full absolute URLs in the `filename`
   * field (e.g. "https://raw.githubusercontent.com/.../fixes.js"). The DOFUS
   * manifest stores relative paths (e.g. "build/script.js"). We detect which
   * case we're in and build the download URL accordingly.
   */
  private async _downloadManifestFiles(
    diffManifest: DiffManifest,
    remoteManifest: Manifest,
    baseUrl: string
  ): Promise<Files> {
    const files: Files = {}
    const toDownload = Object.keys(diffManifest).filter((k) => diffManifest[k] === 1)

    logger.info(`GameUpdater -> downloading ${toDownload.length} file(s)`)

    for (const key of toDownload) {
      const manifestFile = remoteManifest.files[key]
      if (!manifestFile) continue

      // If the filename is already an absolute URL use it directly;
      // otherwise, prefix with the base URL.
      const isAbsoluteUrl = /^https?:\/\//.test(manifestFile.filename)
      const fileUrl = isAbsoluteUrl ? manifestFile.filename : baseUrl + manifestFile.filename

      // Strip query-string from the key so we can write a clean filename to disk
      const diskKey = key.split('?')[0]

      try {
        const response = await this._httpClient.get(fileUrl)
        files[diskKey] = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
        logger.info(`GameUpdater -> downloaded ${manifestFile.filename}`)
      } catch (err) {
        logger.error(`GameUpdater -> failed to download ${fileUrl}: ${err}`)
        throw err
      }
    }

    return files
  }

  /**
   * Extract game versions.
   * buildVersion is now baked directly into script.js as:
   *   window.buildVersion = "1.73.0-4"
   * appVersion still comes from the iTunes lookup.
   */
  private async _detectVersions(missingDofusFiles: Files): Promise<GameVersion> {
    const localVersions: GameVersion = fs.existsSync(LOCAL_VERSIONS_PATH)
      ? JSON.parse(fs.readFileSync(LOCAL_VERSIONS_PATH, 'utf-8'))
      : { buildVersion: '0.0.0', appVersion: '0.0.0' }

    const buildScript = missingDofusFiles['build/script.js']
    if (buildScript && typeof buildScript === 'string') {
      // Extract from: window.buildVersion="1.73.0-4"
      const match = buildScript.match(/window\.buildVersion\s*=\s*"([\d.]+(?:-\d+)?)"/)
      if (match) {
        localVersions.buildVersion = match[1]
        logger.info(`GameUpdater -> buildVersion detected: ${localVersions.buildVersion}`)
      } else {
        logger.warn('GameUpdater -> could not extract buildVersion from script.js')
      }

      // Fetch appVersion from iTunes (still alive)
      try {
        const itunesResponse = await this._httpClient.get<ItunesLookup>(DOFUS_ITUNES_ORIGIN)
        if (itunesResponse.data.results?.[0]?.version) {
          localVersions.appVersion = itunesResponse.data.results[0].version
          logger.info(`GameUpdater -> appVersion from iTunes: ${localVersions.appVersion}`)
        }
      } catch (err) {
        logger.warn('GameUpdater -> iTunes lookup failed, keeping cached appVersion: ' + err)
      }
    }

    logger.info(`GameUpdater -> versions: build=${localVersions.buildVersion} app=${localVersions.appVersion}`)
    return localVersions
  }

  /**
   * Write downloaded file contents to disk at GAME_PATH + filename.
   */
  private _writeMissingFiles(files: Files) {
    for (const filename in files) {
      let fileContent: string
      if (typeof files[filename] === 'object') {
        fileContent = JSON.stringify(files[filename])
      } else {
        fileContent = files[filename] as string
      }

      const outputPath = GAME_PATH + filename
      const dir = path.dirname(outputPath)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(outputPath, fileContent)
    }
  }

  /**
   * Apply lindo's regex patches to DOFUS game files.
   * regex.json maps filename → array of [find, replace] pairs.
   */
  private _applyRegex(lindoDiffManifest: DiffManifest, missingLindoFiles: Files, missingDofusFiles: Files) {
    let regex: RegexPatches

    if (lindoDiffManifest['regex.json'] === 1) {
      regex = (typeof missingLindoFiles['regex.json'] === 'string'
        ? JSON.parse(missingLindoFiles['regex.json'])
        : missingLindoFiles['regex.json']) as RegexPatches
    } else {
      regex = fs.existsSync(LOCAL_REGEX_PATH) ? JSON.parse(fs.readFileSync(LOCAL_REGEX_PATH, 'utf-8')) : {}
    }

    for (const filename in regex) {
      if (!missingDofusFiles[filename]) continue

      // Remove the obsolete proxyconnection.touch.dofus.com patch which causes a black screen
      regex[filename] = regex[filename].filter((patch) => !patch[1].includes('proxyconnection.touch.dofus.com'))

      // Beautify the file first so regexes have a consistent format to match
      if (/\.js$/.test(filename)) {
        missingDofusFiles[filename] = beautify.js(missingDofusFiles[filename] as string, {
          break_chained_methods: true
        })
      } else if (/\.css$/.test(filename)) {
        missingDofusFiles[filename] = beautify.css(missingDofusFiles[filename] as string)
      }

      for (const i in regex[filename]) {
        missingDofusFiles[filename] = (missingDofusFiles[filename] as string).replace(
          new RegExp(regex[filename][i][0], 'g'),
          regex[filename][i][1]
        )
      }
    }
  }
}
