'use client'

import { ReactNode, useMemo, useRef, useState } from 'react'

import {
  ActionSheet,
  ActionSheetAction,
  ActionSheetCloseReason,
} from './action-sheet'

type OpenActionSheetOptions = {
  title?: string
  description?: string
  actions: ActionSheetAction[]
  cancelText?: string
  onClose?: (reason: ActionSheetCloseReason) => void
}

type ActionSheetState = Omit<OpenActionSheetOptions, 'onClose'> & {
  open: boolean
}

export function useActionSheet() {
  const onCloseRef = useRef<OpenActionSheetOptions['onClose']>(undefined)
  const [state, setState] = useState<ActionSheetState>({
    open: false,
    title: undefined,
    description: undefined,
    actions: [],
    cancelText: '取消',
  })

  const closeActionSheet = (reason: ActionSheetCloseReason = 'cancel') => {
    onCloseRef.current?.(reason)
    onCloseRef.current = undefined

    setState((currentState) => ({
      ...currentState,
      open: false,
    }))
  }

  const openActionSheet = (options: OpenActionSheetOptions) => {
    onCloseRef.current = options.onClose
    setState({
      open: true,
      title: options.title,
      description: options.description,
      actions: options.actions,
      cancelText: options.cancelText ?? '取消',
    })
  }

  const actionSheetNode: ReactNode = useMemo(
    () => (
      <ActionSheet
        open={state.open}
        title={state.title}
        description={state.description}
        actions={state.actions}
        cancelText={state.cancelText}
        onClose={closeActionSheet}
      />
    ),
    [state],
  )

  return {
    openActionSheet,
    closeActionSheet,
    actionSheetNode,
    isActionSheetOpen: state.open,
  }
}
