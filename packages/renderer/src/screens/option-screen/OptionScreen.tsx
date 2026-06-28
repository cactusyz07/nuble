import { useDialog } from '@/hooks'
import { useI18nContext } from '@lindo/i18n'
import {
  Box,
  Button,
  darken,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Tab,
  Tabs,
  useTheme
} from '@mui/material'
import React, { useState } from 'react'
import { About } from './about'
import { ChangelogDialog } from './changelog'
import { OptionFeatures } from './features'
import { OptionGeneral } from './general'
import { OptionMultiAccount } from './multi-account'
import { OptionNotifications } from './notifications'
import { OptionShortcuts } from './shortcuts'
import { TabPanel } from './TabPanel'

export const OptionScreen = () => {
  const [selectedTab, setSelectedTab] = useState(0)
  const [openResetDialog, , toggleResetDialog] = useDialog()
  const [openChangelogDialog, , toggleChangelogDialog] = useDialog()
  const { LL } = useI18nContext()
  const theme = useTheme()

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue === 6) {
      toggleChangelogDialog()
      return
    }
    setSelectedTab(newValue)
  }

  const handleResetStore = () => {
    window.lindoAPI.resetStore()
    toggleResetDialog()
  }

  const tabStyles = {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 500,
    fontSize: '14px',
    textTransform: 'none',
    minHeight: '52px',
    transition: 'all 0.2s ease',
    borderRadius: '0 16px 16px 0',
    mr: 1,
    '&:hover': {
      color: '#fff',
      background: 'rgba(255, 255, 255, 0.05)',
      transform: 'translateX(4px)'
    },
    '&.Mui-selected': {
      color: '#fff',
      fontWeight: 600,
      background: 'linear-gradient(90deg, rgba(0, 191, 255, 0.15) 0%, rgba(0, 102, 255, 0.05) 100%)'
    }
  }

  return (
    <>
      <Box sx={{ flexGrow: 1, width: '100vw', height: '100vh', display: 'flex', background: 'linear-gradient(135deg, #101018 0%, #1a1a26 100%)', color: '#fff', overflow: 'hidden' }}>
        <Tabs
          orientation='vertical'
          variant='scrollable'
          value={selectedTab}
          onChange={handleChange}
          aria-label='option-categories'
          sx={{
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            width: '180px',
            flexShrink: 0,
            background: 'rgba(20, 20, 30, 0.65)',
            backdropFilter: 'blur(20px)',
            pt: 2,
            '& .MuiTabs-indicator': {
              width: '4px',
              borderRadius: '0 4px 4px 0',
              background: 'linear-gradient(180deg, #00bfff 0%, #0066ff 100%)',
              boxShadow: '0 0 12px rgba(0, 191, 255, 0.6)'
            }
          }}
        >
          <Tab label={LL.option.general.title()} sx={tabStyles} />
          <Tab label={LL.option.shortcuts.title()} sx={tabStyles} />
          <Tab label={LL.option.features.title()} sx={tabStyles} />
          <Tab label={LL.option.notifications.title()} sx={tabStyles} />
          <Tab label={LL.option.multiAccount.title()} sx={tabStyles} />
          <Tab label={LL.option.about.title()} sx={tabStyles} />
          <Tab label={'Changelog'} sx={{ ...tabStyles, color: '#ff66b2', '&:hover': { color: '#ff99cb', background: 'rgba(255, 102, 178, 0.05)', transform: 'translateX(4px)' } }} />
        </Tabs>
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Paper
            square
            sx={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              overflowY: 'auto',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(10px)',
              p: 3,
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-track': { background: 'rgba(0,0,0,0.1)' },
              '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: '4px' },
              '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255,255,255,0.3)' }
            }}
          >
            <TabPanel value={selectedTab} index={0}>
              <OptionGeneral />
            </TabPanel>
            <TabPanel value={selectedTab} index={1}>
              <OptionShortcuts />
            </TabPanel>
            <TabPanel value={selectedTab} index={2}>
              <OptionFeatures />
            </TabPanel>
            <TabPanel value={selectedTab} index={3}>
              <OptionNotifications />
            </TabPanel>
            <TabPanel value={selectedTab} index={4}>
              <OptionMultiAccount />
            </TabPanel>
            <TabPanel value={selectedTab} index={5}>
              <About />
            </TabPanel>
          </Paper>
          <Box
            sx={{
              background: 'rgba(15, 15, 22, 0.85)',
              backdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <Button
              color='error'
              onClick={toggleResetDialog}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '12px',
                px: 3,
                py: 1.2,
                border: '1px solid rgba(255, 77, 77, 0.3)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'rgba(255, 77, 77, 0.15)',
                  borderColor: '#ff4d4d',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(255, 77, 77, 0.3)'
                }
              }}
            >
              {LL.window.options.button.reset()}
            </Button>
            <Button
              variant='contained'
              onClick={() => window.lindoAPI.closeOptionWindow()}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '12px',
                px: 4,
                py: 1.2,
                background: 'linear-gradient(135deg, #00bfff 0%, #0066ff 100%)',
                boxShadow: '0 4px 16px rgba(0, 153, 255, 0.4)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1ad1ff 0%, #1a75ff 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0, 153, 255, 0.6)'
                }
              }}
            >
              {LL.window.options.button.close()}
            </Button>
          </Box>
        </Box>
      </Box>
      <Dialog
        open={openResetDialog}
        onClose={toggleResetDialog}
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #181824 0%, #202030 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
            p: 1,
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '20px', color: '#ff4d4d' }}>
          {LL.window.options.dialogs.resetSettings.title()}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '15px', mt: 1 }}>
            {LL.window.options.dialogs.resetSettings.message()}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={toggleResetDialog}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '10px',
              px: 2.5,
              py: 1,
              '&:hover': { background: 'rgba(255, 255, 255, 0.05)', color: '#fff' }
            }}
          >
            {LL.window.options.dialogs.resetSettings.cancel()}
          </Button>
          <Button
            onClick={handleResetStore}
            autoFocus
            sx={{
              background: 'linear-gradient(135deg, #ff4d4d 0%, #ff1a1a 100%)',
              color: '#fff',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '10px',
              px: 3,
              py: 1,
              boxShadow: '0 4px 16px rgba(255, 77, 77, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #ff6666 0%, #ff3333 100%)',
                boxShadow: '0 6px 20px rgba(255, 77, 77, 0.6)',
                transform: 'translateY(-1px)'
              }
            }}
          >
            {LL.window.options.dialogs.resetSettings.confirm()}
          </Button>
        </DialogActions>
      </Dialog>
      <ChangelogDialog open={openChangelogDialog} onClose={toggleChangelogDialog} />
    </>
  )
}

