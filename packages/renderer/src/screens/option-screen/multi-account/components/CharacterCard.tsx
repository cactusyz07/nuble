import { useStores } from '@/store'
import { useI18nContext } from '@lindo/i18n'
import { GameCharacter, GameCharacterSnapshot } from '@lindo/shared'
import CloseIcon from '@mui/icons-material/Close'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { Box, Button, IconButton, Typography } from '@mui/material'
import { Observer } from 'mobx-react-lite'
import React from 'react'

export interface CharacterCardProps {
  character: GameCharacter | GameCharacterSnapshot
  onSelect?: (character: GameCharacter) => void
  onRemove?: () => void
  display?: 'preview' | 'action'
}

export const CharacterCard = ({
  character,
  onSelect,
  onRemove,
  display = 'action'
}: CharacterCardProps) => {
  const { optionStore } = useStores()
  const { LL } = useI18nContext()

  const handleDeleteCharacter = (character: GameCharacter) => {
    optionStore.gameMultiAccount.removeCharacter(character)
  }

  return (
    <Observer>
      {() => (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            px: 2.5,
            py: 1.5,
            transition: 'background-color 0.15s ease',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
              }}
            />
            <Typography
              sx={{
                fontWeight: 500,
                fontSize: '0.95rem',
                color: 'text.primary',
                letterSpacing: '-0.1px'
              }}
            >
              {character.name}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {display === 'action' && (
              <>
                {onSelect ? (
                  <Button
                    size='small'
                    variant='contained'
                    onClick={() => onSelect(character as GameCharacter)}
                    sx={{
                      borderRadius: '6px',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      py: 0.5,
                      px: 2
                    }}
                  >
                    {LL.option.multiAccount.characterCard.buttons.select()}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant='contained'
                      startIcon={<PlayArrowIcon sx={{ fontSize: '1rem !important' }} />}
                      onClick={() => window.lindoAPI.openGameWindow(character.id)}
                      sx={{
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        borderRadius: '6px',
                        px: 2.5,
                        py: 0.5,
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        textTransform: 'none',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          backgroundColor: '#059669',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                        }
                      }}
                    >
                      Play
                    </Button>
                    <IconButton
                      onClick={() => handleDeleteCharacter(character as GameCharacter)}
                      size='small'
                      sx={{
                        color: 'text.secondary',
                        width: 28,
                        height: 28,
                        borderRadius: '6px',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          color: '#ef4444',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)'
                        }
                      }}
                    >
                      <CloseIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                  </>
                )}
              </>
            )}
            {onRemove && (
              <IconButton
                onClick={onRemove}
                size='small'
                sx={{
                  color: 'text.secondary',
                  width: 28,
                  height: 28,
                  borderRadius: '6px',
                  '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                }}
              >
                <CloseIcon sx={{ fontSize: '1.1rem' }} />
              </IconButton>
            )}
          </Box>
        </Box>
      )}
    </Observer>
  )
}
