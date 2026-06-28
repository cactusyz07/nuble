import { GameMultiAccountSnapshot, IPCEvents, RootStore } from '@lindo/shared'
import { ipcMain } from 'electron'
import { UnlockWindow } from './windows'
import { logger } from './logger'

export class MultiAccount {
  private _rootStore: RootStore

  constructor(rootStore: RootStore) {
    this._rootStore = rootStore

    ipcMain.handle(IPCEvents.SAVE_MASTER_PASSWORD, () => Promise.resolve())
    ipcMain.handle(IPCEvents.REMOVE_MASTER_PASSWORD, () => Promise.resolve())
    ipcMain.handle(IPCEvents.CHANGE_MASTER_PASSWORD, () => Promise.resolve(true))
    ipcMain.handle(IPCEvents.IS_MASTER_PASSWORD_CONFIGURED, () => Promise.resolve(true))
    ipcMain.handle(IPCEvents.DECRYPT_CHARACTER_PASSWORD, (event, input: string) => Promise.resolve(input))
    ipcMain.handle(IPCEvents.ENCRYPT_CHARACTER_PASSWORD, (event, input: string) => Promise.resolve(input))
    ipcMain.handle(IPCEvents.UNLOCK_APPLICATION, () => Promise.resolve(true))

    this._rootStore.optionStore.gameMultiAccount.setConfigured(true)
    this._rootStore.optionStore.gameMultiAccount.unlock()
  }

  async isEnabled() {
    return this._rootStore.optionStore.multiAccountEnabled
  }

  async unlockWithTeam() {
    const unlockWindow = new UnlockWindow(this._rootStore)
    const closeListener = () => {
      unlockWindow.close()
    }
    ipcMain.on(IPCEvents.CLOSE_UNLOCK_WINDOW, closeListener)

    const selectTeamId = await new Promise<string>((resolve, reject) => {
      ipcMain.handleOnce(IPCEvents.SELECT_TEAM_TO_CONNECT, async (event, teamId: string) => {
        resolve(teamId)
      })
      unlockWindow.once('close', () => {
        reject(new Error('Multi-account unlock window was closed'))
      })
    })

    // close the window and return the selected team id
    unlockWindow.close()
    ipcMain.removeListener(IPCEvents.CLOSE_UNLOCK_WINDOW, closeListener)
    return selectTeamId
  }
}
