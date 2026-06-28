import { FollowInstruction, GameTeam, GameTeamWindow, IPCEvents, MultiAccountContext, RootStore } from '@lindo/shared'
import { app, BeforeSendResponse, BrowserWindow, HeadersReceivedResponse, shell, webContents, globalShortcut } from 'electron'
import { attachTitlebarToWindow } from 'custom-electron-titlebar/main'
import { join } from 'path'
import { EventEmitter } from 'stream'
import TypedEmitter from 'typed-emitter'
import { generateUserArgent } from '../utils'
import { logger } from '../logger'
import { observe } from 'mobx'
import { electronLocalshortcut } from '@hfelix/electron-localshortcut'
import { platform } from 'os'

type GameWindowEvents = {
  close: (event: Event) => void
}
export class GameWindow extends (EventEmitter as new () => TypedEmitter<GameWindowEvents>) {
  private readonly _win: BrowserWindow
  private readonly _store: RootStore
  private readonly _teamWindow?: GameTeamWindow
  private readonly _team?: GameTeam
  private readonly _characterId?: string
  private readonly _onFocusWindow: (index: number) => void
  private _isMuted = false
  private readonly _index: number
  private readonly _shortcutStoreDisposer: () => void

  get id() {
    return this._win.webContents.id!
  }

  get multiAccount(): MultiAccountContext | undefined {
    if (this._teamWindow && this._team) {
      return {
        teamWindowId: this._teamWindow.id,
        teamId: this._team.id,
        characterId: this._characterId
      }
    }
  }

  private constructor({
    index,
    userAgent,
    store,
    team,
    url,
    teamWindow,
    characterId,
    onFocusWindow
  }: {
    index: number
    userAgent: string
    store: RootStore
    url: string
    team?: GameTeam
    teamWindow?: GameTeamWindow
    characterId?: string
    onFocusWindow: (index: number) => void
  }) {
    super()
    this._index = index
    this._store = store
    this._teamWindow = teamWindow
    this._team = team
    this._characterId = characterId
    this._onFocusWindow = onFocusWindow
    this._win = new BrowserWindow({
      show: false,
      resizable: true,
      frame: platform() !== 'linux',
      title: 'Nuble',
      icon: join(__dirname, '../../resources/nuble.ico'),
      fullscreenable: true,
      fullscreen: this._store.optionStore.window.fullScreen,
      width: this._store.optionStore.window.resolution.width,
      height: this._store.optionStore.window.resolution.height,
      titleBarStyle: 'hidden',
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        backgroundThrottling: false,
        partition: this._characterId ? 'persist:' + this._characterId : 'persist:' + this._index,
        sandbox: false,
        allowRunningInsecureContent: true,
        webviewTag: true,
        webSecurity: false // required to load dofus files from local server
      }
    })

    const session = this._win.webContents.session

    // Ankama's Electron auth path (function c in script.js) works by:
    // 1. window.open(authUrl, '_blank') - opens a popup
    // 2. Polling the popup every 2s via t.eval() to find '?electron=code=XXX' in the URL
    // 3. When found, closes popup and fires the callback with the code
    //
    // So we must NOT intercept or cancel any requests to auth.ankama.com.
    // We only need to catch dofustouch:// as a safety fallback (shouldn't happen in Electron mode).
    session.webRequest.onBeforeRequest((details, callback) => {
      if (details.url.startsWith('dofustouch://')) {
        logger.info(`Caught dofustouch:// deeplink: ${details.url}`)
        this._win.webContents.send(IPCEvents.OAUTH_CALLBACK, details.url)
        return callback({ cancel: true })
      }
      callback({})
    })

    this._win.webContents.setWindowOpenHandler(() => {
      return { action: 'allow' }
    })

    // Also catch dofustouch:// via will-navigate/will-redirect as belt-and-suspenders
    const handleNavigation = (event: Electron.Event, url: string, popupWindow?: Electron.BrowserWindow) => {
      if (url.startsWith('dofustouch://')) {
        logger.info('Caught dofustouch:// via navigation: ' + url)
        event.preventDefault()
        this._win.webContents.send(IPCEvents.OAUTH_CALLBACK, url)
        if (popupWindow) popupWindow.close()
      }
    }

    this._win.webContents.on('will-navigate', (e, u) => handleNavigation(e, u))
    this._win.webContents.on('will-redirect', (e, u) => handleNavigation(e, u))

    this._win.webContents.on('did-create-window', (popupWindow) => {
      popupWindow.webContents.on('will-navigate', (e, u) => handleNavigation(e, u, popupWindow))
      popupWindow.webContents.on('will-redirect', (e, u) => handleNavigation(e, u, popupWindow))
    })

    // ── Outbound header cleanup ─────────────────────────────────────────────
    session.webRequest.onBeforeSendHeaders(
      {
        urls: [
          'https://static.ankama.com/*',
          'https://dofustouch.cdn.ankama.com/*',
          'https://dt-proxy-production-login.ankama-games.com/*',
          'https://*.ankama.com/*',
          'https://*.ankama-games.com/*'
        ]
      },
      (details, callback) => {
        const requestHeaders = { ...(details.requestHeaders ?? {}) }
        delete requestHeaders.Referer
        delete requestHeaders.referer
        delete requestHeaders['sec-ch-ua']
        delete requestHeaders['sec-ch-ua-mobile']
        delete requestHeaders['sec-ch-ua-platform']
        delete requestHeaders['Sec-Fetch-Site']
        delete requestHeaders['Sec-Fetch-Mode']
        delete requestHeaders['Sec-Fetch-Dest']
        delete requestHeaders['Origin']
        delete requestHeaders['origin']

        requestHeaders['Referer'] = 'https://haapi.ankama.com/'

        const beforeSendResponse: BeforeSendResponse = { requestHeaders }
        callback(beforeSendResponse)
      }
    )

    // --- REQUEST DEBUGGER FOR 403 ISSUES ---
    const requestMap = new Map<number, any>()
    
    session.webRequest.onBeforeRequest(
      { urls: ['<all_urls>'] },
      (details, callback) => {
        if (details.method === 'POST') {
          let body = ''
          if (details.uploadData && details.uploadData.length > 0) {
            body = details.uploadData.map(data => data.bytes ? data.bytes.toString() : '').join('')
          }
          requestMap.set(details.id, { url: details.url, method: details.method, body })
        }
        callback({ cancel: false })
      }
    )

    session.webRequest.onSendHeaders(
      { urls: ['<all_urls>'] },
      (details) => {
        if (details.method === 'POST' && requestMap.has(details.id)) {
          const req = requestMap.get(details.id)
          req.headers = details.requestHeaders
        }
      }
    )

    session.webRequest.onCompleted(
      { urls: ['<all_urls>'] },
      (details) => {
        if (details.method === 'POST' && details.statusCode >= 400 && requestMap.has(details.id)) {
          const req = requestMap.get(details.id)
          logger.error(`\n================= ${details.statusCode} FAILED POST =================`)
          logger.error(`URL: ${req.url}`)
          logger.error(`Request Body: ${req.body}`)
          logger.error(`Request Headers: ${JSON.stringify(req.headers, null, 2)}`)
          logger.error(`Response Headers: ${JSON.stringify(details.responseHeaders, null, 2)}`)
          logger.error(`======================================================\n`)
          requestMap.delete(details.id)
        } else if (details.method === 'POST' && requestMap.has(details.id)) {
          // Clean up successful ones so map doesn't leak memory infinitely
          requestMap.delete(details.id)
        }
      }
    )
    // ----------------------------------------

    // ── Inbound CSP override ────────────────────────────────────────────────
    // Ankama's CDN sends strict CSP headers that would block asset loading
    // from inside Electron (origin is 'null' for local files).
    // We strip / replace CSP to allow the CDN assets to load freely.
    session.webRequest.onHeadersReceived((details, callback) => {
      // Do not apply the custom Game CSP to popup windows (like Ankama Auth)
      if (details.webContentsId !== undefined && details.webContentsId !== this._win.webContents.id) {
        return callback({ responseHeaders: details.responseHeaders })
      }

      const responseHeaders = { ...(details.responseHeaders ?? {}) }

      // Remove any restrictive CSP that would block CDN assets
      delete responseHeaders['content-security-policy']
      delete responseHeaders['Content-Security-Policy']
      delete responseHeaders['x-frame-options']
      delete responseHeaders['X-Frame-Options']

      // Inject permissive CSP — allows: local server, Ankama domains, Ankama CDN
      responseHeaders['Content-Security-Policy'] = [
        [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
          'data: blob:',
          'http://localhost:*',
          'http://127.0.0.1:*',
          'https://*.ankama.com',
          'https://*.ankama-games.com',
          'https://dofustouch.cdn.ankama.com',
          'https://dt-proxy-production-login.ankama-games.com',
          'https://m1.openfpcdn.io',
          'wss://*.ankama.com',
          'wss://*.ankama-games.com'
        ].join(' ')
      ]

      const headersReceivedResponse: HeadersReceivedResponse = { responseHeaders }
      callback(headersReceivedResponse)
    })

    // ── Show window when page is ready ─────────────────────────────────────
    this._win.webContents.on('ipc-message', (event, channel) => {
      if (channel === IPCEvents.APP_READY_TO_SHOW) {
        setTimeout(() => {
          this._win.show()
        }, 100)
      }
    })

    // ── Pipe ALL renderer console output to the main-process terminal ───────
    // This lets us see [DIAG] logs, game errors, and WebSocket traces directly
    // in the yarn dev terminal without opening DevTools.
    this._win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      const prefix = `[RENDERER-CONSOLE] (${sourceId}:${line})`
      if (level >= 3) logger.error(`${prefix} ${message}`)
      else logger.info(`${prefix} ${message}`)
    })

    this._win.webContents.setUserAgent(userAgent)
    this._win.webContents.setAudioMuted(this._store.optionStore.window.audioMuted)

    this._win.on('close', (event) => {
      logger.debug('GameWindow -> close')
      this._close(event)
    })

    this._win.on('focus', () => {
      if (this._store.optionStore.window.audioMuted || this._isMuted) {
        this._win.webContents.setAudioMuted(true)
        return
      }
      this._win.webContents.setAudioMuted(false)
    })

    this._win.on('blur', () => {
      if (this._store.optionStore.window.audioMuted || this._isMuted) {
        this._win.webContents.setAudioMuted(true)
        return
      }
      if (this._store.optionStore.window.soundOnFocus) {
        this._win.webContents.setAudioMuted(true)
      }
    })

    const registerShortcuts = () => {
      electronLocalshortcut.unregisterAll(this._win)
      this._store.hotkeyStore.window.tabs.forEach((tab, index) => {
        if (tab) {
          electronLocalshortcut.register(this._win, tab, () => {
            this._win.webContents.send(IPCEvents.SELECT_TAB, index)
          })
        }
      })
      this._store.hotkeyStore.window.windows.forEach((winShortcut, index) => {
        if (winShortcut) {
          try {
            globalShortcut.unregister(winShortcut)
            globalShortcut.register(winShortcut, () => {
              logger.info(`Window switch global hotkey triggered for index: ${index}`)
              this._onFocusWindow(index)
            })
          } catch (e) {
            logger.error(`Failed to register global shortcut ${winShortcut}: ${e}`)
          }
        }
      })
    }

    const disposeTabs = observe(this._store.hotkeyStore.window.tabs, registerShortcuts, true)
    const disposeWindows = observe(this._store.hotkeyStore.window.windows, registerShortcuts, true)

    this._shortcutStoreDisposer = () => {
      disposeTabs()
      disposeWindows()
    }

    if (app.isPackaged) {
      this._win.loadURL(url)
    } else {
      // 🚧 Use ['ENV_NAME'] avoid vite:define plugin
      // eslint-disable-next-line dot-notation
      const devUrl = `http://${process.env['VITE_DEV_SERVER_HOST']}:${process.env['VITE_DEV_SERVER_PORT']}`
      this._win.loadURL(devUrl)
      if (process.env.NODE_ENV === 'development') {
        this._win.webContents.openDevTools({ mode: 'detach' })
      }
    }

    // Make all links open with the browser, not with the application
    this._win.webContents.setWindowOpenHandler(({ url: openUrl }) => {
      // Allow Ankama Auth to open as an internal popup so window.opener.postMessage works
      if (openUrl.includes('ankama.com') || openUrl.includes('ankama-games.com')) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            autoHideMenuBar: true,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true
            }
          }
        }
      }

      if (openUrl.startsWith('https:')) shell.openExternal(openUrl)
      return { action: 'deny' }
    })

    attachTitlebarToWindow(this._win)
  }

  static async init({
    index,
    store,
    team,
    url,
    teamWindow,
    characterId,
    onFocusWindow
  }: {
    index: number
    store: RootStore
    url: string
    team?: GameTeam
    teamWindow?: GameTeamWindow
    characterId?: string
    onFocusWindow: (index: number) => void
  }): Promise<GameWindow> {
    const userAgent = await generateUserArgent(store.appStore.appVersion)
    return new GameWindow({ index, url, userAgent, store, team, teamWindow, characterId, onFocusWindow })
  }

  private _close(event: Event) {
    this._win.removeAllListeners()
    electronLocalshortcut.unregisterAll(this._win)
    this._shortcutStoreDisposer()
    this.emit('close', event)
  }

  focus = () => {
    logger.info(`Focusing game window index: ${this._index}`)
    if (this._win.isMinimized()) this._win.restore()
    this._win.setAlwaysOnTop(true)
    this._win.show()
    this._win.focus()
    this._win.setAlwaysOnTop(false)
  }
  isMinimized = () => this._win.isMinimized()
  restore = () => this._win.restore()

  toggleMaximize() {
    return this._win.isMaximized() ? this._win.unmaximize() : this._win.maximize()
  }

  setAudioMute(value: boolean) {
    this._isMuted = value
    this._win.webContents.setAudioMuted(value)
  }

  sendAutoGroupInstruction(instruction: FollowInstruction) {
    this._win.webContents.send(IPCEvents.AUTO_GROUP_PUSH_PATH, instruction)
  }

  clearCache() {
    return this._win.webContents.session.clearCache()
  }
}
