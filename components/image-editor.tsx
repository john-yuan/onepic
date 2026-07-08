'use client'

import Image from 'next/image'
import { MouseEvent, TouchEvent, useEffect, useRef } from 'react'

export type ImageEditorValue = {
  scale: number
  offsetX: number
  offsetY: number
}

type ImageEditorProps = {
  alt: string
  src: string
  value: ImageEditorValue
  viewportWidth: number
  viewportHeight: number
  onChange: (value: ImageEditorValue) => void
}

const MAX_SCALE = 4

function clampOffset(scale: number, offsetX: number, offsetY: number) {
  const minOffset = 1 - scale

  return {
    offsetX: Math.min(0, Math.max(minOffset, offsetX)),
    offsetY: Math.min(0, Math.max(minOffset, offsetY)),
  }
}

function clampValue(value: ImageEditorValue): ImageEditorValue {
  const scale = Math.min(MAX_SCALE, Math.max(1, value.scale))
  const offset = clampOffset(scale, value.offsetX, value.offsetY)

  return {
    scale,
    offsetX: offset.offsetX,
    offsetY: offset.offsetY,
  }
}

function zoomFromPoint(
  currentValue: ImageEditorValue,
  nextScale: number,
  focalX: number,
  focalY: number,
  viewportWidth: number,
  viewportHeight: number,
): ImageEditorValue {
  const safeNextScale = Math.min(MAX_SCALE, Math.max(1, nextScale))
  const currentOffsetX = currentValue.offsetX * viewportWidth
  const currentOffsetY = currentValue.offsetY * viewportHeight
  const nextOffsetX =
    focalX -
    ((focalX - currentOffsetX) / currentValue.scale) * safeNextScale
  const nextOffsetY =
    focalY -
    ((focalY - currentOffsetY) / currentValue.scale) * safeNextScale

  return clampValue({
    scale: safeNextScale,
    offsetX: nextOffsetX / viewportWidth,
    offsetY: nextOffsetY / viewportHeight,
  })
}

export function ImageEditor({
  alt,
  src,
  value,
  viewportWidth,
  viewportHeight,
  onChange,
}: ImageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()

      const rect = container.getBoundingClientRect()
      const focalX = event.clientX - rect.left
      const focalY = event.clientY - rect.top
      const nextScale = event.deltaY < 0 ? value.scale * 1.1 : value.scale / 1.1

      onChange(
        zoomFromPoint(
          value,
          nextScale,
          focalX,
          focalY,
          rect.width,
          rect.height,
        ),
      )
    }

    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [onChange, value])

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()

    const startX = event.clientX
    const startY = event.clientY
    const startValue = value
    const rect = event.currentTarget.getBoundingClientRect()

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / rect.width
      const deltaY = (moveEvent.clientY - startY) / rect.height

      onChange(
        clampValue({
          ...startValue,
          offsetX: startValue.offsetX + deltaX,
          offsetY: startValue.offsetY + deltaY,
        }),
      )
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      const startX = touch.clientX
      const startY = touch.clientY
      const startValue = value
      const rect = event.currentTarget.getBoundingClientRect()

      const handleTouchMove = (moveEvent: globalThis.TouchEvent) => {
        if (moveEvent.touches.length !== 1) {
          return
        }

        moveEvent.preventDefault()

        const moveTouch = moveEvent.touches[0]
        const deltaX = (moveTouch.clientX - startX) / rect.width
        const deltaY = (moveTouch.clientY - startY) / rect.height

        onChange(
          clampValue({
            ...startValue,
            offsetX: startValue.offsetX + deltaX,
            offsetY: startValue.offsetY + deltaY,
          }),
        )
      }

      const handleTouchEnd = () => {
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
        window.removeEventListener('touchcancel', handleTouchEnd)
      }

      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)
      window.addEventListener('touchcancel', handleTouchEnd)
      return
    }

    if (event.touches.length === 2) {
      const firstTouch = event.touches.item(0)
      const secondTouch = event.touches.item(1)

      if (!firstTouch || !secondTouch) {
        return
      }

      const rect = event.currentTarget.getBoundingClientRect()
      let previousDistance = Math.hypot(
        secondTouch.clientX - firstTouch.clientX,
        secondTouch.clientY - firstTouch.clientY,
      )
      let previousCenterX =
        (firstTouch.clientX + secondTouch.clientX) / 2 - rect.left
      let previousCenterY =
        (firstTouch.clientY + secondTouch.clientY) / 2 - rect.top

      const handleTouchMove = (moveEvent: globalThis.TouchEvent) => {
        if (moveEvent.touches.length !== 2) {
          return
        }

        moveEvent.preventDefault()

        const moveFirstTouch = moveEvent.touches.item(0)
        const moveSecondTouch = moveEvent.touches.item(1)

        if (!moveFirstTouch || !moveSecondTouch) {
          return
        }

        const currentDistance = Math.hypot(
          moveSecondTouch.clientX - moveFirstTouch.clientX,
          moveSecondTouch.clientY - moveFirstTouch.clientY,
        )
        const currentCenterX =
          (moveFirstTouch.clientX + moveSecondTouch.clientX) / 2 - rect.left
        const currentCenterY =
          (moveFirstTouch.clientY + moveSecondTouch.clientY) / 2 - rect.top
        const centerDeltaX = (currentCenterX - previousCenterX) / rect.width
        const centerDeltaY = (currentCenterY - previousCenterY) / rect.height
        const movedValue = clampValue({
          ...value,
          offsetX: value.offsetX + centerDeltaX,
          offsetY: value.offsetY + centerDeltaY,
        })
        const nextValue = zoomFromPoint(
          movedValue,
          movedValue.scale * (currentDistance / previousDistance),
          currentCenterX,
          currentCenterY,
          rect.width,
          rect.height,
        )

        previousDistance = currentDistance
        previousCenterX = currentCenterX
        previousCenterY = currentCenterY
        onChange(nextValue)
      }

      const handleTouchEnd = () => {
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
        window.removeEventListener('touchcancel', handleTouchEnd)
      }

      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)
      window.addEventListener('touchcancel', handleTouchEnd)
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${viewportWidth} / ${viewportHeight}`,
        overflow: 'hidden',
        touchAction: 'none',
        backgroundColor: '#ffffff',
        userSelect: 'none',
        cursor: value.scale > 1 ? 'grab' : 'default',
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        draggable={false}
        style={{
          objectFit: 'fill',
          transformOrigin: 'top left',
          transform: `translate(${value.offsetX * 100}%, ${value.offsetY * 100}%) scale(${value.scale})`,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
