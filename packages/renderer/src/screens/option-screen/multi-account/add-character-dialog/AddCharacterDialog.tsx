import React, { useEffect } from 'react'
import { useStores } from '@/store'
import { GameCharacterSnapshotIn } from '@lindo/shared'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material'
import { useForm } from 'react-hook-form'
import { TextFieldElement } from 'react-hook-form-mui'
import { useI18nContext } from '@lindo/i18n'

export interface AddCharacterDialogProps {
  open: boolean
  onClose: () => void
}

export const AddCharacterDialog = ({ onClose, open }: AddCharacterDialogProps) => {
  const { optionStore } = useStores()
  const { control, handleSubmit, reset } = useForm<GameCharacterSnapshotIn>()
  const { LL } = useI18nContext()

  useEffect(() => {
    reset()
  }, [open])

  const onSubmit = (data: GameCharacterSnapshotIn) => {
    optionStore.gameMultiAccount.addCharacter({
      name: data.name,
      account: 'none',
      password: 'none'
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{LL.option.multiAccount.dialogs.characterDialog.title()}</DialogTitle>
      <DialogContent>
        <Stack
          id='character-form'
          spacing={2}
          sx={{ mt: 2, minWidth: '300px' }}
          component='form'
          noValidate
          autoComplete='off'
          onSubmit={handleSubmit(onSubmit)}
        >
          <TextFieldElement name='name' control={control} required fullWidth label={'Window / Character Name'} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{LL.option.multiAccount.dialogs.characterDialog.cancel()}</Button>
        <Button variant='outlined' type='submit' form='character-form'>
          {LL.option.multiAccount.dialogs.characterDialog.confirm()}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
