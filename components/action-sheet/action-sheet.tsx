'use client'

import { useEffect } from 'react'

export type ActionSheetAction = {
  key: string
  label: string
  description?: string
  disabled?: boolean
  tone?: 'default' | 'danger'
  onSelect?: () => void | Promise<void>
}

type ActionSheetProps = {
  open: boolean
  title?: string
  description?: string
  actions: ActionSheetAction[]
  cancelText?: string
  onClose: () => void
}

const ACTION_SHEET_ANIMATION_MS = 220

export function ActionSheet({
  open,
  title,
  description,
  actions,
  cancelText = '取消',
  onClose,
}: ActionSheetProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  return (
    <div
      aria-hidden={!open}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backgroundColor: open ? 'rgba(17, 24, 39, 0.4)' : 'rgba(17, 24, 39, 0)',
        padding: 12,
        boxSizing: 'border-box',
        pointerEvents: open ? 'auto' : 'none',
        visibility: open ? 'visible' : 'hidden',
        transition: [
          `background-color ${ACTION_SHEET_ANIMATION_MS}ms ease`,
          `visibility 0ms linear ${open ? '0ms' : `${ACTION_SHEET_ANIMATION_MS}ms`}`,
        ].join(', '),
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: 640,
          transform: open ? 'translateY(0)' : 'translateY(32px)',
          opacity: open ? 1 : 0,
          transition: [
            `transform ${ACTION_SHEET_ANIMATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
            `opacity ${ACTION_SHEET_ANIMATION_MS}ms ease`,
          ].join(', '),
          willChange: 'transform, opacity',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            overflow: 'hidden',
            borderRadius: 20,
            backgroundColor: 'rgba(242, 242, 247, 0.82)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
            border: '0.5px solid rgba(255, 255, 255, 0.65)',
          }}
        >
          {title || description ? (
            <div
              style={{
                padding: '16px 20px 12px',
                textAlign: 'center',
                backgroundColor: '#ffffff',
                borderBottom: '0.5px solid rgba(60, 60, 67, 0.12)',
              }}
            >
              {title ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 400,
                    color: '#8e8e93',
                  }}
                >
                  {title}
                </p>
              ) : null}
              {description ? (
                <p
                  style={{
                    margin: title ? '6px 0 0' : 0,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: '#8e8e93',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div style={{ backgroundColor: '#ffffff' }}>
            {actions.map((action, index) => (
              <button
                key={action.key}
                type="button"
                disabled={action.disabled}
                onClick={async () => {
                  if (action.disabled) {
                    return
                  }

                  onClose()
                  await action.onSelect?.()
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  borderTop:
                    index === 0 ? 'none' : '0.5px solid rgba(60, 60, 67, 0.12)',
                  padding: '16px 20px',
                  backgroundColor: '#ffffff',
                  color: action.tone === 'danger' ? '#ff3b30' : '#007aff',
                  opacity: action.disabled ? 0.5 : 1,
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: 17,
                    fontWeight: 400,
                  }}
                >
                  {action.label}
                </span>
                {action.description ? (
                  <span
                    style={{
                      display: 'block',
                      marginTop: 4,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: '#8e8e93',
                    }}
                  >
                    {action.description}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 8,
            border: 'none',
            borderRadius: 16,
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            color: '#007aff',
            fontSize: 17,
            fontWeight: 400,
            cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
            marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)',
          }}
        >
          {cancelText}
        </button>
      </div>
    </div>
  )
}
