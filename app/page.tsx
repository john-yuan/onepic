
'use client'

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { ChangeEvent, useEffect, useRef, useState } from 'react'

type SelectedImage = {
  id: string
  name: string
  previewUrl: string
  element: HTMLImageElement
  width: number
  height: number
}

type CanvasSummary = {
  count: number
  width: number
  height: number
}

type DrawPlan = {
  image: SelectedImage
  drawWidth: number
  drawHeight: number
}

function loadImage(file: File): Promise<SelectedImage> {
  const previewUrl = URL.createObjectURL(file)

  return new Promise((resolve, reject) => {
    const image = new window.Image()

    image.onload = () => {
      resolve({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        previewUrl,
        element: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    }

    image.onerror = () => {
      URL.revokeObjectURL(previewUrl)
      reject(new Error(`无法读取图片: ${file.name}`))
    }

    image.src = previewUrl
  })
}

function buildDrawPlans(images: SelectedImage[]): {
  summary: CanvasSummary
  drawPlans: DrawPlan[]
} | null {
  if (images.length === 0) {
    return null
  }

  const targetWidth = Math.min(...images.map((image) => image.width))
  const drawPlans = images.map((image) => {
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
  const totalHeight = drawPlans.reduce((sum, plan) => sum + plan.drawHeight, 0)

  return {
    summary: {
      count: images.length,
      width: targetWidth,
      height: totalHeight,
    },
    drawPlans,
  }
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<SelectedImage[]>([])
  const [images, setImages] = useState<SelectedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const canvasData = buildDrawPlans(images)
  const summary = canvasData?.summary ?? null

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    return () => {
      for (const image of imagesRef.current) {
        URL.revokeObjectURL(image.previewUrl)
      }
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    if (images.length === 0) {
      canvas.width = 0
      canvas.height = 0
      return
    }

    if (!canvasData) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      setErrorMessage('无法获取 Canvas 上下文')
      return
    }

    canvas.width = canvasData.summary.width
    canvas.height = canvasData.summary.height
    context.clearRect(0, 0, canvas.width, canvas.height)

    let offsetY = 0

    for (const plan of canvasData.drawPlans) {
      context.drawImage(
        plan.image.element,
        0,
        offsetY,
        plan.drawWidth,
        plan.drawHeight,
      )
      offsetY += plan.drawHeight
    }
  }, [canvasData, images.length])

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
      setImages((currentImages) => [...currentImages, ...loadedImages])
    } catch (error) {
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

  const removeImage = (id: string) => {
    setImages((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.id === id)

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl)
      }

      return currentImages.filter((image) => image.id !== id)
    })
  }

  const moveImage = (id: string, direction: 'up' | 'down') => {
    setImages((currentImages) => {
      const index = currentImages.findIndex((image) => image.id === id)

      if (index < 0) {
        return currentImages
      }

      if (direction === 'up' && index === 0) {
        return currentImages
      }

      if (direction === 'down' && index === currentImages.length - 1) {
        return currentImages
      }

      const nextImages = [...currentImages]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      const [image] = nextImages.splice(index, 1)

      nextImages.splice(targetIndex, 0, image)
      return nextImages
    })
  }

  const actionButtonStyle = {
    width: 36,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 0,
  } as const

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
            {isProcessing
              ? '处理中...'
              : images.length > 0
                ? '继续添加图片'
                : '选择多张图片'}
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

        {images.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {images.map((image, index) => (
              <div
                key={image.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: '#ffffff',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                }}
              >
                <Image
                  src={image.previewUrl}
                  alt={image.name}
                  width={64}
                  height={64}
                  unoptimized
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    objectFit: 'contain',
                    border: '1px solid #e5e7eb',
                    flexShrink: 0,
                    backgroundColor: '#f9fafb',
                  }}
                />

                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#111827',
                      wordBreak: 'break-all',
                    }}
                  >
                    {image.name}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: '#6b7280',
                    }}
                  >
                    {image.width} x {image.height}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => moveImage(image.id, 'up')}
                    disabled={index === 0}
                    aria-label="上移图片"
                    title="上移"
                    style={{
                      ...actionButtonStyle,
                      border: '1px solid #d1d5db',
                      backgroundColor: '#ffffff',
                      color: '#111827',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ArrowUp size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(image.id, 'down')}
                    disabled={index === images.length - 1}
                    aria-label="下移图片"
                    title="下移"
                    style={{
                      ...actionButtonStyle,
                      border: '1px solid #d1d5db',
                      backgroundColor: '#ffffff',
                      color: '#111827',
                      cursor:
                        index === images.length - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ArrowDown size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    aria-label="删除图片"
                    title="删除"
                    style={{
                      ...actionButtonStyle,
                      border: 'none',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
