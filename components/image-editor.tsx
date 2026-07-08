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

type TouchGesture =
  | {
      type: 'pan'
      startX: number
      startY: number
      startValue: ImageEditorValue
      rectWidth: number
      rectHeight: number
    }
  | {
      type: 'pinch'
      previousDistance: number
      previousCenterX: number
      previousCenterY: number
      rectWidth: number
      rectHeight: number
    }
  | null

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
  const valueRef = useRef(value)
  const touchGestureRef = useRef<TouchGesture>(null)

  useEffect(() => {
    valueRef.current = value
  }, [value])

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
    const rect = event.currentTarget.getBoundingClientRect()

    if (event.touches.length === 1) {
      const touch = event.touches[0]

      touchGestureRef.current = {
        type: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
        startValue: valueRef.current,
        rectWidth: rect.width,
        rectHeight: rect.height,
      }
      return
    }

    if (event.touches.length === 2) {
      const firstTouch = event.touches.item(0)
      const secondTouch = event.touches.item(1)

      if (!firstTouch || !secondTouch) {
        return
      }

      touchGestureRef.current = {
        type: 'pinch',
        previousDistance: Math.hypot(
          secondTouch.clientX - firstTouch.clientX,
          secondTouch.clientY - firstTouch.clientY,
        ),
        previousCenterX:
          (firstTouch.clientX + secondTouch.clientX) / 2 - rect.left,
        previousCenterY:
          (firstTouch.clientY + secondTouch.clientY) / 2 - rect.top,
        rectWidth: rect.width,
        rectHeight: rect.height,
      }
    }
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const gesture = touchGestureRef.current

    if (!gesture) {
      return
    }

    if (event.touches.length === 1 && gesture.type === 'pan') {
      event.preventDefault()

      const touch = event.touches[0]
      const deltaX = (touch.clientX - gesture.startX) / gesture.rectWidth
      const deltaY = (touch.clientY - gesture.startY) / gesture.rectHeight

      onChange(
        clampValue({
          ...gesture.startValue,
          offsetX: gesture.startValue.offsetX + deltaX,
          offsetY: gesture.startValue.offsetY + deltaY,
        }),
      )
      return
    }

    if (event.touches.length === 2) {
      event.preventDefault()

      const firstTouch = event.touches.item(0)
      const secondTouch = event.touches.item(1)

      if (!firstTouch || !secondTouch) {
        return
      }

      if (gesture.type !== 'pinch') {
        const rect = event.currentTarget.getBoundingClientRect()

        touchGestureRef.current = {
          type: 'pinch',
          previousDistance: Math.hypot(
            secondTouch.clientX - firstTouch.clientX,
            secondTouch.clientY - firstTouch.clientY,
          ),
          previousCenterX:
            (firstTouch.clientX + secondTouch.clientX) / 2 - rect.left,
          previousCenterY:
            (firstTouch.clientY + secondTouch.clientY) / 2 - rect.top,
          rectWidth: rect.width,
          rectHeight: rect.height,
        }
        return
      }

      const currentDistance = Math.hypot(
        secondTouch.clientX - firstTouch.clientX,
        secondTouch.clientY - firstTouch.clientY,
      )
      const containerRect = event.currentTarget.getBoundingClientRect()
      const normalizedCenterX =
        (firstTouch.clientX + secondTouch.clientX) / 2 - containerRect.left
      const normalizedCenterY =
        (firstTouch.clientY + secondTouch.clientY) / 2 - containerRect.top
      const centerDeltaX =
        (normalizedCenterX - gesture.previousCenterX) / gesture.rectWidth
      const centerDeltaY =
        (normalizedCenterY - gesture.previousCenterY) / gesture.rectHeight
      const movedValue = clampValue({
        ...valueRef.current,
        offsetX: valueRef.current.offsetX + centerDeltaX,
        offsetY: valueRef.current.offsetY + centerDeltaY,
      })
      const nextValue = zoomFromPoint(
        movedValue,
        movedValue.scale * (currentDistance / gesture.previousDistance),
        normalizedCenterX,
        normalizedCenterY,
        gesture.rectWidth,
        gesture.rectHeight,
      )

      touchGestureRef.current = {
        ...gesture,
        previousDistance: currentDistance,
        previousCenterX: normalizedCenterX,
        previousCenterY: normalizedCenterY,
      }
      onChange(nextValue)
    }
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 0) {
      touchGestureRef.current = null
      return
    }

    if (event.touches.length === 1) {
      const touch = event.touches[0]
      const rect = event.currentTarget.getBoundingClientRect()

      touchGestureRef.current = {
        type: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
        startValue: valueRef.current,
        rectWidth: rect.width,
        rectHeight: rect.height,
      }
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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
