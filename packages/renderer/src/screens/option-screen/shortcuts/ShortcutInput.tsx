import { IconButton, InputAdornment, TextField } from '@mui/material'
import React, { useState, KeyboardEvent, memo } from 'react'
import { useI18nContext } from '@lindo/i18n'
import { Close } from '@mui/icons-material'

const KEY_MAPPER = {
  ArrowRight: 'Right',
  ArrowLeft: 'Left',
  ArrowDown: 'Down',
  ArrowUp: 'Up',
  ' ': 'Space'
}

const MODIFIERS = /^(Meta|CommandOrControl|CmdOrCtrl|Command|Cmd|Control|Ctrl|AltGr|Option|Alt|Shift|Super)$/i
const KEY_CODES =
  /^(Num[0-9]|Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen|F24|F23|F22|F21|F20|F19|F18|F17|F16|F15|F14|F13|F12|F11|F10|F9|F8|F7|F6|F5|F4|F3|F2|F1|[0-9A-Z)!@#$%^&*(:<_>?~{|}";=,\-./`[\\\]'])$/i

export interface ShortcutInputProps {
  id: string
  label: string
  value: string
  onChange?: (shortcut: string) => void
  restrictKeyCode?: boolean
}

export const capitalizeFirstLetter = (value: string) => {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// eslint-disable-next-line react/display-name
export const ShortcutInput = memo<ShortcutInputProps>(({ id, label, value, onChange, restrictKeyCode = false }) => {
  const { LL } = useI18nContext()
  const [isInvalidKeyCode, setInvalidKeyCode] = useState(false)
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    event.stopPropagation()

    let key = ''
    let prefix = ''

    if (event.ctrlKey) {
      prefix += 'Ctrl+'
    }

    if (event.shiftKey) {
      prefix += 'Shift+'
    }

    if (event.altKey) {
      prefix += 'Alt+'
    }

    if (event.metaKey) {
      prefix += 'CmdOrCtrl+'
    }

    // prevent using modifier key as shortcut
    if (MODIFIERS.test(event.key)) return
    // prevent using invalid electron accelerator for tab switching
    if (restrictKeyCode) {
      if (!KEY_CODES.test(event.key)) {
        setInvalidKeyCode(true)
        return
      }
      setInvalidKeyCode(false)
    }
    const normalizeKey = Object.hasOwn(KEY_MAPPER, event.key)
      ? KEY_MAPPER[event.key as never]
      : capitalizeFirstLetter(event.key)

    key = prefix + normalizeKey

    if (onChange) onChange(key)
  }

  const handleClear = () => {
    if (onChange) onChange('')
  }

  return (
    <TextField
      id={id}
      label={label}
      size='small'
      variant='outlined'
      onKeyDown={handleKeyDown}
      value={value}
      error={isInvalidKeyCode}
      helperText={isInvalidKeyCode && LL.option.shortcuts.error()}
      onBlur={() => setInvalidKeyCode(false)}
      InputProps={{
        endAdornment: (
          <InputAdornment position='end'>
            <IconButton aria-label='clear shortcut' onClick={handleClear} edge='end' size='small' sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}>
              <Close fontSize='small' />
            </IconButton>
          </InputAdornment>
        ),
        sx: {
          borderRadius: '10px',
          background: 'rgba(20, 20, 32, 0.6)',
          backdropFilter: 'blur(10px)',
          fontSize: '13px',
          fontWeight: 600,
          color: '#00bfff',
          letterSpacing: '0.5px',
          height: '42px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          transition: 'all 0.2s ease',
          pr: '10px',
          '& .MuiInputBase-input': {
            pr: '12px'
          },
          '&:hover': {
            background: 'rgba(30, 30, 45, 0.8)',
            borderColor: 'rgba(0, 191, 255, 0.4)',
            boxShadow: '0 0 10px rgba(0, 191, 255, 0.2)'
          },
          '&.Mui-focused': {
            background: 'rgba(25, 25, 40, 0.9)',
            borderColor: '#00bfff',
            boxShadow: '0 0 14px rgba(0, 191, 255, 0.4)'
          },
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none'
          }
        }
      }}
      InputLabelProps={{
        shrink: true,
        sx: {
          fontSize: '13px',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.7)',
          overflow: 'visible',
          whiteSpace: 'normal',
          '&.Mui-focused': {
            color: '#00bfff'
          }
        }
      }}
      sx={{ width: '100%', mb: 0.5 }}
    />
  )
})
