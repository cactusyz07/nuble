import React from 'react'
import styles from './tab.module.scss'
import classNames from 'classnames'
import { darken, lighten, styled } from '@mui/material'
import { Add } from '@mui/icons-material'
import { useStores } from '@/store'
import { useI18nContext } from '@lindo/i18n'

interface TabAddProps {
  className?: string
}

export const TabAdd = styled((props: TabAddProps) => {
  const { gameStore } = useStores()
  const { LL } = useI18nContext()

  const handleAddGame = () => {
    if (gameStore.games.length < 6) {
      gameStore.addGame()
    } else {
      alert(LL.window.main.tabsOverflow.text())
      gameStore.addGame()
    }
  }

  return (
    <div onClick={handleAddGame} className={classNames(styles.tab, props.className)}>
      <Add sx={{ fontSize: 26, color: 'rgba(255, 255, 255, 0.8)' }} />
    </div>
  )
})(
  ({ theme }) => `
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  border-radius: 18px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(0, 230, 153, 0.15);
    border: 1px solid #00e699;
    color: #ffffff;
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 24px rgba(0, 230, 153, 0.3);
  }
`
)
