
'use client'

import { ChangeEvent, useRef, useState } from 'react'

type LoadedImage = {
  element: HTMLImageElement
  width: number
  height: number
}

type CanvasSummary = {
  count: number
  width: number
  height: number
}

function loadImage(file: File): Promise<LoadedImage> {
  const objectUrl = URL.createObjectURL(file)

  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      resolve({
        element: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
      URL.revokeObjectURL(objectUrl)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`无法读取图片: ${file.name}`))
    }

    image.src = objectUrl
  })
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [summary, setSummary] = useState<CanvasSummary | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handlePickImages = () => {
    inputRef.current?.click()
  }

  const handleFilesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files

    if (!files || files.length === 0) {
      return
    }

    setIsProcessing(true)
    setErrorMessage('')

    try {
      const loadedImages = await Promise.all(Array.from(files).map(loadImage))
      const targetWidth = Math.min(...loadedImages.map((image) => image.width))
      const drawPlans = loadedImages.map((image) => {
        if (image.width <= targetWidth) {
          return {
            image,
            drawWidth: image.width,
            drawHeight: image.height,
          }
        }

        const scale = targetWidth / image.width

        return {
          image,
          drawWidth: targetWidth,
          drawHeight: Math.round(image.height * scale),
        }
      })
      const totalHeight = drawPlans.reduce(
        (sum, plan) => sum + plan.drawHeight,
        0,
      )
      const canvas = canvasRef.current

      if (!canvas) {
        throw new Error('Canvas 未初始化')
      }

      canvas.width = targetWidth
      canvas.height = totalHeight

      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('无法获取 Canvas 上下文')
      }

      context.clearRect(0, 0, canvas.width, canvas.height)

      let offsetY = 0

      for (const plan of drawPlans) {
        context.drawImage(
          plan.image.element,
          0,
          offsetY,
          plan.drawWidth,
          plan.drawHeight,
        )
        offsetY += plan.drawHeight
      }

      setSummary({
        count: loadedImages.length,
        width: targetWidth,
        height: totalHeight,
      })
    } catch (error) {
      setSummary(null)
      setErrorMessage(
        error instanceof Error ? error.message : '图片处理失败，请重试。',
      )
    } finally {
      event.target.value = ''
      setIsProcessing(false)
    }
  }

  const handleDownload = async () => {
    const canvas = canvasRef.current

    if (!canvas || !summary) {
      return
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })

    if (!blob) {
      setErrorMessage('导出图片失败，请重试。')
      return
    }

    const downloadUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = downloadUrl
    anchor.download = 'merged-image.png'
    anchor.click()
    URL.revokeObjectURL(downloadUrl)
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '24px 16px 40px',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={handlePickImages}
            disabled={isProcessing}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              backgroundColor: '#111827',
              color: '#ffffff',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            {isProcessing ? '处理中...' : '选择多张图片'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!summary}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '10px 16px',
              backgroundColor: '#ffffff',
              color: '#111827',
              cursor: summary ? 'pointer' : 'not-allowed',
            }}
          >
            保存图片
          </button>

          {summary ? (
            <span style={{ color: '#4b5563', fontSize: 14 }}>
              {summary.count} 张图片，导出尺寸 {summary.width} x {summary.height}
            </span>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesChange}
          style={{ display: 'none' }}
        />

        {errorMessage ? (
          <p style={{ margin: '0 0 16px', color: '#dc2626' }}>{errorMessage}</p>
        ) : null}

        <div
          style={{
            width: '100%',
            overflow: 'hidden',
            borderRadius: 12,
            backgroundColor: '#ffffff',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: summary ? 'block' : 'none',
              width: '100%',
              maxWidth: '100%',
              height: 'auto',
              margin: '0 auto',
              backgroundColor: '#ffffff',
            }}
          />

          {!summary ? (
            <p style={{ margin: 0, color: '#6b7280' }}>
              选择多张图片后，会按顺序上下拼接并生成一张高清导出图。
            </p>
          ) : null}
        </div>
      </div>
    </main>
  )
}
