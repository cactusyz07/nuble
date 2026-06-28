import React from 'react'
import { styled } from '@mui/system'
import { Settings, VolumeOff, VolumeUp } from '@mui/icons-material'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'

import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers'
import { Observer } from 'mobx-react-lite'
import { Game, useStores } from '@/store'
import { TabAdd, TabGame } from './tab'
import { Box, IconButton, Tooltip } from '@mui/material'

const SideBarContainer = styled('div')(({ theme }) => ({
  background: 'linear-gradient(180deg, rgba(24, 24, 34, 0.85) 0%, rgba(15, 15, 25, 0.95) 100%)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRight: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
  overflowX: 'hidden',
  overflowY: 'auto',
  width: '76px',
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'column',
  paddingTop: '12px',
  paddingBottom: '12px',
  zIndex: 100,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}))

const SortableItem = ({ game }: { game: Game }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: game.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TabGame game={game} />
    </div>
  )
}
export const SideBar = () => {
  const { gameStore } = useStores()
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
        tolerance: 10
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleOpenOption = () => {
    window.lindoAPI.openOptionWindow()
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      gameStore.moveGame(active.id as string, over!.id as string)
    }
  }

  const handleToggleVolume = () => {
    gameStore.toggleMute()
  }

  return (
    <SideBarContainer>
      <Observer>
        {() => (
          <DndContext
            sensors={sensors}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            collisionDetection={closestCenter}
          >
            <SortableContext items={gameStore.gamesOrder.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              {gameStore.gamesOrder.map((game) => (
                <SortableItem key={game.id} game={game} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Observer>
      <TabAdd />
      <Box sx={{ flex: 1 }} />

      <Tooltip title={gameStore.isMuted ? 'Unmute Audio' : 'Mute Audio'} placement='right'>
        <IconButton
          onClick={handleToggleVolume}
          sx={{
            mb: 2,
            width: 48,
            height: 48,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.15)',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }
          }}
          aria-label='toggle-volume'
        >
          <Observer>
            {() => (gameStore.isMuted ? <VolumeOff sx={{ color: '#ff5c5c' }} /> : <VolumeUp sx={{ color: '#00e699' }} />)}
          </Observer>
        </IconButton>
      </Tooltip>
      <Tooltip title='Settings & Multi-Account' placement='right'>
        <IconButton
          onClick={handleOpenOption}
          sx={{
            mb: 1,
            width: 48,
            height: 48,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.15)',
              transform: 'translateY(-2px) rotate(30deg)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }
          }}
          aria-label='settings'
        >
          <Settings sx={{ color: '#00bfff' }} />
        </IconButton>
      </Tooltip>
    </SideBarContainer>
  )
}
