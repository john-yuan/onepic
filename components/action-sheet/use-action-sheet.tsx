'use client'

import { ReactNode, useMemo, useState } from 'react'

import { ActionSheet, ActionSheetAction } from './action-sheet'

type OpenActionSheetOptions = {
  title?: string
  description?: string
  actions: ActionSheetAction[]
  cancelText?: string
}

type ActionSheetState = OpenActionSheetOptions & {
  open: boolean
}

export function useActionSheet() {
  const [state, setState] = useState<ActionSheetState>({
    open: false,
    title: undefined,
    description: undefined,
    actions: [],
    cancelText: '取消',
  })

  const closeActionSheet = () => {
    setState((currentState) => ({
      ...currentState,
      open: false,
    }))
  }

  const openActionSheet = (options: OpenActionSheetOptions) => {
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
