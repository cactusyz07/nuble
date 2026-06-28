import React, { useRef, useEffect } from 'react'
import styles from './tab.module.scss'
import classNames from 'classnames'
import { darken, IconButton, lighten, styled, Tooltip } from '@mui/material'
import { Keyboard, Close } from '@mui/icons-material'
import { Game, useStores } from '@/store'
import { Observer } from 'mobx-react-lite'
import { reaction } from 'mobx'

export interface TabGameProps {
  game: Game
  className?: string
}

export const TabGame = styled(({ game, className }: TabGameProps) => {
  const { gameStore } = useStores()
  const characterIconRef = useRef<HTMLDivElement>(null)

  const handleClose = (event: React.MouseEvent) => {
    gameStore.removeGame(game)
    event.preventDefault()
    return event.stopPropagation()
  }

  useEffect(() => {
    const updateCharIcon = () => {
      if (characterIconRef.current && game.characterIcon) {
        characterIconRef.current.appendChild(game.characterIcon)
        characterIconRef.current.style.display = 'block'
      } else if (characterIconRef.current) {
        characterIconRef.current.innerHTML = ''
        characterIconRef.current.style.display = 'none'
      }
    }
    const disposer = reaction(
      () => game.characterIcon,
      () => {
        updateCharIcon()
      }
    )
    updateCharIcon()

    return disposer
  }, [game])

  return (
    <Observer>
      {() => {
        const active = gameStore.selectedGame === game
        return (
          <Tooltip title={game.characterName ?? ''} placement='right'>
            <div
              onClick={() => gameStore.selectGame(game)}
              className={classNames(styles.tab, styles['tab-game'], className, {
                focus: active,
                notification: game.hasNotification
              })}
            >
              <div className={styles['icon-char']} ref={characterIconRef} />
              {!game.characterIcon && <Keyboard sx={{ fontSize: 24, color: 'rgba(255, 255, 255, 0.8)' }} />}
              <IconButton className={styles['tab-close']} onClick={handleClose}>
                <Close sx={{ fontSize: 14, color: '#ffffff' }} />
              </IconButton>
            </div>
          </Tooltip>
        )
      }}
    </Observer>
  )
})(
  ({ theme }) => `
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 18px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 8px 24px rgba(0, 191, 255, 0.3);
      color: #ffffff;
    }
    &.notification {
      opacity: 1;
      animation: tabPulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    &.focus {
      opacity: 1;
      color: #ffffff;
      background: linear-gradient(135deg, rgba(0, 191, 255, 0.25) 0%, rgba(0, 102, 255, 0.15) 100%);
      border: 2px solid #00bfff;
      box-shadow: 0 0 20px rgba(0, 191, 255, 0.5);
      transform: scale(1.05);
    }

    @keyframes tabPulse {
      0% {
        border-color: #fffc89;
        box-shadow: 0 0 10px rgba(255, 252, 137, 0.4);
      }
      50% {
        border-color: #ff8d5f;
        box-shadow: 0 0 25px rgba(255, 141, 95, 0.8);
      }
      100% {
        border-color: #fffc89;
        box-shadow: 0 0 10px rgba(255, 252, 137, 0.4);
      }
    }
`
)
