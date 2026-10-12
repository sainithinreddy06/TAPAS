'use client'

// Trimmed version of the shadcn/ui toast store. TAPAS only ever shows short
// confirmations ("CAP XML downloaded"), so one toast at a time is enough.

import * as React from 'react'

import type { ToastActionElement, ToastProps } from './toast'

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 4000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

type State = { toasts: ToasterToast[] }

type Action =
  | { type: 'ADD_TOAST'; toast: ToasterToast }
  | { type: 'UPDATE_TOAST'; toast: Partial<ToasterToast> & { id: string } }
  | { type: 'DISMISS_TOAST'; toastId?: string }
  | { type: 'REMOVE_TOAST'; toastId?: string }

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const listeners: ((state: State) => void)[] = []
let memoryState: State = { toasts: [] }
const timeouts = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleRemoval(toastId: string) {
  if (timeouts.has(toastId)) return
  timeouts.set(
    toastId,
    setTimeout(() => {
      timeouts.delete(toastId)
      dispatch({ type: 'REMOVE_TOAST', toastId })
    }, TOAST_REMOVE_DELAY),
  )
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TOAST':
      return { toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) }

    case 'UPDATE_TOAST':
      return {
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      }

    case 'DISMISS_TOAST': {
      const { toastId } = action
      if (toastId) scheduleRemoval(toastId)
      else state.toasts.forEach((t) => scheduleRemoval(t.id))
      return {
        toasts: state.toasts.map((t) =>
          toastId === undefined || t.id === toastId ? { ...t, open: false } : t,
        ),
      }
    }

    case 'REMOVE_TOAST':
      if (action.toastId === undefined) return { toasts: [] }
      return { toasts: state.toasts.filter((t) => t.id !== action.toastId) }

    default:
      return state
  }
}

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

type Toast = Omit<ToasterToast, 'id'>

function toast(props: Toast) {
  const id = genId()
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id,
    dismiss,
    update: (next: Partial<ToasterToast>) =>
      dispatch({ type: 'UPDATE_TOAST', toast: { ...next, id } }),
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

export { useToast, toast }
