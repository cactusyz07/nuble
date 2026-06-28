import { DofusWindow, HTMLIFrameElementWithDofus } from '@/dofus-window'
import { useGameContext } from '@/providers'
import { useStores } from '@/store'
import { Game } from '@/store/game-store/game'
import { useI18nContext } from '@lindo/i18n'
import { reaction } from 'mobx'
import React, { memo, useEffect, useRef } from 'react'
import { useGameManager } from './use-game-manager'

export interface GameScreenProps {
  game: Game
}

// eslint-disable-next-line react/display-name
export const GameScreen = memo(({ game }: GameScreenProps) => {
  const gameContext = useGameContext()
  const rootStore = useStores()
  const { LL } = useI18nContext()
  const gameManager = useGameManager({
    game,
    rootStore,
    LL
  })
  const iframeGameRef = useRef<HTMLIFrameElementWithDofus>(null)

  useEffect(() => {
    const unsubscribeOAuth = window.lindoAPI.subscribeToOAuthCallback((url: string) => {
      if (iframeGameRef.current && iframeGameRef.current.contentWindow) {
        try {
          const cw = iframeGameRef.current.contentWindow as any
          window.lindoAPI.logger.info('Received OAuth callback URL: ' + url)()
          
          if (cw.lindoDeeplinkCallback) {
            const queryString = url.includes('?') ? url.split('?')[1] : ''
            window.lindoAPI.logger.info('Passing OAuth token via IonicDeeplink mock: ' + queryString)()
            cw.lindoDeeplinkCallback({
              host: 'authorized',
              path: '',
              queryString: queryString,
              url: url
            })
          } else {
            window.lindoAPI.logger.error('lindoDeeplinkCallback is not yet set on game window!')()
          }
        } catch (e) {
          window.lindoAPI.logger.error('Failed to pass OAuth token to game', e)()
        }
      }
    })

    const disposeReaction = reaction(
      () => rootStore.gameStore.selectedGame,
      (selectedGame) => {
        if (selectedGame?.id === game.id) {
          setTimeout(() => {
            iframeGameRef.current?.focus()
          }, 100)
        }
      },
      { fireImmediately: true }
    )

    return () => {
      unsubscribeOAuth()
      disposeReaction()
    }
  }, [])

  const handleLoad = () => {
    if (iframeGameRef.current) {
      const gameWindow = iframeGameRef.current.contentWindow

      // only for debug purpose
      gameWindow.findSingleton = (searchKey: string, window: DofusWindow) => {
        const singletons = Object.values(window.singletons.c)

        const results = singletons.filter(({ exports }) => {
          if (!!exports.prototype && searchKey in exports.prototype) {
            return true
          } else if (searchKey in exports) {
            return true
          } else return false
        })

        if (results.length > 1) {
          window.lindoAPI.logger.error(
            `[MG] Singleton searcher found multiple results for key "${searchKey}". Returning all of them.`
          )()
          return results
        }

        return results.pop()
      }

      // can't use SQL Database in modern iframe
      gameWindow.openDatabase = undefined

      if (typeof gameWindow.initDofus === 'function') {
        gameWindow.initDofus(() => {
          gameManager.init(gameWindow)
        })
      }
    }
  }

  return (
    <iframe
      id={`iframe-game-${game.id}`}
      ref={iframeGameRef}
      onLoad={handleLoad}
      style={{ border: 'none', width: '100%', height: '100%' }}
      src={gameContext.gameSrc}
    />
  )
})
