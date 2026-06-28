import { useStores } from '@/store'
import React from 'react'
import { Box, Button, Typography, Paper, Divider } from '@mui/material'
import { Observer } from 'mobx-react-lite'
import AddIcon from '@mui/icons-material/Add'
import { CharacterCard } from '../components'
import { useDialog } from '@/hooks'
import { AddCharacterDialog } from '../add-character-dialog'
import { useI18nContext } from '@lindo/i18n'

export const AccountContainer = () => {
  const {
    optionStore: { gameMultiAccount }
  } = useStores()
  const { LL } = useI18nContext()
  const [openAddCharacterDialog, , toggleAddCharacterDialog] = useDialog()

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Profiles & Windows
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={toggleAddCharacterDialog}
            startIcon={<AddIcon sx={{ fontSize: '1.1rem !important' }} />}
            sx={{
              backgroundColor: '#0066ff',
              color: '#ffffff',
              fontWeight: 500,
              fontSize: '0.8rem',
              py: 0.6,
              px: 2,
              borderRadius: '6px',
              textTransform: 'none',
              boxShadow: '0 2px 6px rgba(0, 102, 255, 0.3)',
              '&:hover': {
                backgroundColor: '#0052cc',
                boxShadow: '0 4px 12px rgba(0, 102, 255, 0.4)'
              }
            }}
          >
            {LL.option.multiAccount.addCharacter()}
          </Button>
        </Box>

        <Paper
          elevation={0}
          sx={{
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            overflow: 'hidden'
          }}
        >
          <Observer>
            {() => (
              <>
                {gameMultiAccount.characters.length === 0 ? (
                  <Typography
                    sx={{
                      textAlign: 'center',
                      color: 'text.secondary',
                      py: 5,
                      fontSize: '0.85rem'
                    }}
                  >
                    No windows configured yet. Click "ADD CHARACTER" above to create your first profile.
                  </Typography>
                ) : (
                  gameMultiAccount.characters.map((character, index) => (
                    <React.Fragment key={character.id}>
                      {index > 0 && <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />}
                      <CharacterCard character={character} />
                    </React.Fragment>
                  ))
                )}
              </>
            )}
          </Observer>
        </Paper>
      </Box>
      <AddCharacterDialog open={openAddCharacterDialog} onClose={toggleAddCharacterDialog} />
    </>
  )
}
