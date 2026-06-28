import React from 'react'
import { Box, Switch, FormControlLabel, Typography, Divider } from '@mui/material'
import { Observer } from 'mobx-react-lite'
import { useI18nContext } from '@lindo/i18n'
import { AccountContainer } from './account-container'
import { useStores } from '@/store'

export const OptionMultiAccount = () => {
  const { LL } = useI18nContext()
  const { optionStore } = useStores()

  return (
    <Observer>
      {() => (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 4, maxWidth: '900px', mx: 'auto', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '1.25rem', color: 'text.primary', letterSpacing: '-0.2px' }}>
                Multi-Account Manager
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>
                Manage and launch independent, isolated game instances effortlessly.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={optionStore.multiAccountEnabled}
                    onChange={(_, checked) => optionStore.setMultiAccountEnabled(checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0066ff',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0066ff',
                      }
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: optionStore.multiAccountEnabled ? 'text.primary' : 'text.secondary' }}>
                    {optionStore.multiAccountEnabled ? 'Active' : 'Disabled'}
                  </Typography>
                }
                labelPlacement="start"
                sx={{ m: 0, gap: 1 }}
              />
            </Box>
          </Box>

          <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

          {optionStore.multiAccountEnabled && (
            <Box sx={{ flex: 1 }}>
              <AccountContainer />
            </Box>
          )}
        </Box>
      )}
    </Observer>
  )
}
