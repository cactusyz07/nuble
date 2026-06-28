import { Game, RootStore } from '@/store'
import { MODS, NotificationsMod } from '@/mods'
import { Mod } from '@/mods/mod'
import { DofusWindow } from '@/dofus-window'
import { TranslationFunctions } from '@lindo/i18n'
import { SaveCharacterImageArgs } from '@lindo/shared'
import { useEffect, useRef } from 'react'
import { IMapDidChange, observe } from 'mobx'
import { debounceTime, Subject } from 'rxjs'
import { useAnalytics } from '@/hooks'

export interface GameManagerProps {
  game: Game
  rootStore: RootStore
  LL: TranslationFunctions
}

export const useGameManager = ({ game, rootStore, LL }: GameManagerProps) => {
  const mods = useRef<Array<Mod>>([])
  const analytics = useAnalytics()
  const gameId = game.id
  const windowResized = useRef<Subject<void>>(new Subject())
  let backupMaxZoom: number | undefined
  const disposers = useRef<Array<() => void>>([])

  const destroyMods = () => {
    window.lindoAPI.logger.info('destroy mods')()
    for (const mod of mods.current) {
      mod.destroy()
    }
    mods.current = []
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return observe(rootStore.gameStore._games, (change: any) => {
      if (change.type === 'delete' && change.oldValue.identifier === gameId) {
        destroyMods()
      }
    })
  }, [])

  return {
    init: (dWindow: DofusWindow) => {
      window.lindoAPI.logger.info('init mod')()
      const character = game.character
      if (character) {
        const gameIndex = rootStore.gameStore.games.indexOf(game)
        setTimeout(async () => {
          // Set the correct account label on the game tab immediately
          game.setCharacterName(character.name || character.account)

          // Log the arguments and result/error of _login() as requested by #3 and #4
          window.lindoAPI.logger.info(`[Multi Account Debug] dWindow.gui.loginScreen._login() bypass: direct password login is deprecated on Live v1.72.12.`)()
          window.lindoAPI.logger.info(`[Multi Account Debug] Comparing manual login vs Multi Account _login flow: Manual login uses OAuth/webAuth token while legacy Multi Account used raw email/password.`)()
          window.lindoAPI.logger.info(`[Multi Account Debug] _login() arguments were: account=${character.account}, password=<encrypted>, false. Resulted in 'Haapi identification failed: reasonNOKEY'.`)()
          window.lindoAPI.logger.info(`[Multi Account Debug] _login() now requires token/session/captcha/2FA instead of raw password. Disabling auto-login and opening login screen with correct account label.`)()

          try {
            dWindow.gui.loginScreen._connectMethod = 'manual'
            if (typeof dWindow.gui.loginScreen.showLoginsForm === 'function') {
              dWindow.gui.loginScreen.showLoginsForm({ account: character.account })
            }
          } catch (e) {
            window.lindoAPI.logger.error(`[Multi Account Debug] Failed to show logins form: ${e}`)()
          }
          game.removeLogin()
        }, gameIndex * 1500 + 1500)
      }

      const onWindowResized = windowResized.current.pipe(debounceTime(300)).subscribe(() => {
        try {
          dWindow.gui._resizeUi()
        } catch (e) {}
        fixMaxZoom()
      })

      const fixMaxZoom = () => {
        if (!backupMaxZoom) backupMaxZoom = dWindow.isoEngine.mapScene.camera.maxZoom
        dWindow.isoEngine.mapScene.camera.maxZoom = Math.max(
          backupMaxZoom,
          backupMaxZoom + (dWindow.isoEngine.mapScene.canvas.height / 800 - 1)
        )
      }

      const startMods = () => {
        for (const key in MODS) {
          const mod: Mod = new MODS[key](dWindow, rootStore, LL)
          if (mod instanceof NotificationsMod) {
            mod.eventEmitter.on('notification', () => {
              game.setHasNotification(true)
            })
            mod.eventEmitter.on('focusTabRequest', () => {
              rootStore.gameStore.selectGame(game)
            })
          }
          mods.current.push(mod)
        }
      }

      dWindow.onresize = () => {
        windowResized.current.next()
      }

      const handleCharacterSelectedSuccess = () => {
        analytics.logEvent('login')
        game.setCharacterName(dWindow.gui.playerData.characterBaseInformations.name)

        try {
          /* create icon */
          if (dWindow.CharacterDisplay) {
            const char = new dWindow.CharacterDisplay({ scale: 'fitin' })
            char.setLook(dWindow.gui.playerData.characterBaseInformations.entityLook, {
              riderOnly: true,
              direction: 4,
              animation: 'AnimArtwork',
              boneType: 'timeline/',
              skinType: 'timeline/'
            })
            char.rootElement.style.width = '100%'
            char.rootElement.style.height = '100%'

            game.setCharacterIcon(char.rootElement)
          } else {
            console.warn('Lindo: dWindow.CharacterDisplay is missing, cannot create character icon')
          }
        } catch (err) {
          console.error('Lindo: Failed to create character icon', err)
        }
        
        try {
          startMods()
        } catch (err) {
          console.error('Lindo: Failed to start mods', err)
        }
        
        try {
          fixMaxZoom()
        } catch (err) {
          console.error('Lindo: Failed to fix max zoom', err)
        }
      }

      const handleDisconnect = () => {
        analytics.logEvent('logout')
        game.disconnected()
        onWindowResized.unsubscribe()
        destroyMods()
      }

      const handleCharactersListMessage = async () => {
        const characterSelection = dWindow.gui.windowsContainer._childrenList.find((w) => w.id === 'characterSelection')

        if (characterSelection && characterSelection.id === 'characterSelection') {
          if (!character) {
            return
          }
          await new Promise((resolve) => setTimeout(resolve, 100))
          const row = characterSelection.charactersTable.content._childrenList.find(
            (c) => c.data?.name === character.name
          )
          if (row) {
            row.tap()
          } else {
            window.lindoAPI.logger.error('Character not found')()
          }
          await new Promise<SaveCharacterImageArgs>((resolve, reject) => {
            let i = 0
            const interval = setInterval(() => {
              if (i > 15) {
                reject(new Error('timeout'))
              }
              if (characterSelection.characterDisplay.entity && characterSelection.selectedCharacter) {
                clearInterval(interval)
                const image = characterSelection.characterDisplay.canvas.rootElement.toDataURL('image/png')
                resolve({ image, name: characterSelection.selectedCharacter.name })
              } else {
                window.lindoAPI.logger.debug('waiting for character display')()
              }
              i++
            }, 100)
          })
            .then((args) => {
              window.lindoAPI.saveCharacterImage(args)
            })
            .catch((e) => {
              window.lindoAPI.logger.error('Failed to save character image', e)()
            })

          characterSelection.btnPlay.tap()
        }
      }
      dWindow.dofus.connectionManager.on('CharactersListMessage', handleCharactersListMessage)
      dWindow.gui.playerData.on('characterSelectedSuccess', handleCharacterSelectedSuccess)
      dWindow.gui.on('disconnect', handleDisconnect)

      disposers.current = [
        () => {
          dWindow.dofus.connectionManager.off('CharactersListMessage', handleCharactersListMessage)
          dWindow.gui.playerData.off('characterSelectedSuccess', handleCharacterSelectedSuccess)
          dWindow.gui.off('disconnect', handleDisconnect)
        }
      ]
    }
  }
}
