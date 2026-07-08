
'use client'

import { useActionSheet } from '@/components/action-sheet/use-action-sheet'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { PageSizes, PDFDocument } from 'pdf-lib'
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

function getExportFileBaseName() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `onepic_${year}${month}${day}${hours}${minutes}${seconds}`
}

const [A4_WIDTH] = PageSizes.A4
const PDF_MAX_IMAGE_WIDTH = Math.round(A4_WIDTH * 3)

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<SelectedImage[]>([])
  const { actionSheetNode, openActionSheet } = useActionSheet()
  const [images, setImages] = useState<SelectedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExportingImage, setIsExportingImage] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const canvasData = buildDrawPlans(images)
  const summary = canvasData?.summary ?? null
  const isExportBusy = isExportingImage || isExportingPdf

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

  const handleDownloadImage = async (format: 'png' | 'jpeg') => {
    const canvas = canvasRef.current

    if (!canvas || !summary) {
      return
    }

    setIsExportingImage(true)
    setErrorMessage('')

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        if (format === 'png') {
          canvas.toBlob(resolve, 'image/png')
          return
        }

        canvas.toBlob(resolve, 'image/jpeg', 1)
      })

      if (!blob) {
        throw new Error('导出图片失败，请重试。')
      }

      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const fileBaseName = getExportFileBaseName()

      anchor.href = downloadUrl
      anchor.download = `${fileBaseName}.${format}`
      anchor.click()
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '导出图片失败，请重试。',
      )
    } finally {
      setIsExportingImage(false)
    }
  }

  const handleOpenImageExportActionSheet = () => {
    if (!summary || isExportBusy) {
      return
    }

    openActionSheet({
      title: '请选择图片格式',
      description:
        'PNG：画质更稳定，适合保留细节，但文件通常更大。\nJPEG：文件更小，更适合分享，格式本身为有损编码。',
      actions: [
        {
          key: 'png',
          label: '保存为 PNG',
          onSelect: () => handleDownloadImage('png'),
        },
        {
          key: 'jpeg',
          label: '保存为 JPEG',
          onSelect: () => handleDownloadImage('jpeg'),
        },
      ],
    })
  }

  const handleDownloadPdf = async () => {
    const canvas = canvasRef.current

    if (!canvas || !summary) {
      return
    }

    setIsExportingPdf(true)
    setErrorMessage('')

    try {
      const exportWidth = Math.min(summary.width, PDF_MAX_IMAGE_WIDTH)
      const exportHeight = Math.round((summary.height * exportWidth) / summary.width)
      const exportCanvas = document.createElement('canvas')

      exportCanvas.width = exportWidth
      exportCanvas.height = exportHeight

      const exportContext = exportCanvas.getContext('2d')

      if (!exportContext) {
        throw new Error('无法获取 PDF 导出上下文')
      }

      exportContext.imageSmoothingEnabled = true
      exportContext.imageSmoothingQuality = 'high'
      exportContext.drawImage(canvas, 0, 0, exportWidth, exportHeight)

      const jpgDataUrl = exportCanvas.toDataURL('image/jpeg', 1)
      const pdfDoc = await PDFDocument.create()
      const jpgImage = await pdfDoc.embedJpg(jpgDataUrl)
      const pdfHeight = Math.round((summary.height * A4_WIDTH) / summary.width)
      const page = pdfDoc.addPage([A4_WIDTH, pdfHeight])

      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: A4_WIDTH,
        height: pdfHeight,
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const fileBaseName = getExportFileBaseName()

      anchor.href = downloadUrl
      anchor.download = `${fileBaseName}.pdf`
      anchor.click()
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '导出 PDF 失败，请重试。',
      )
    } finally {
      setIsExportingPdf(false)
    }
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
                : '选择图片'}
          </button>

          <button
            type="button"
            onClick={handleOpenImageExportActionSheet}
            disabled={!summary || isExportBusy}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '10px 16px',
              backgroundColor:
                summary && !isExportBusy ? '#ffffff' : '#f3f4f6',
              color: summary && !isExportBusy ? '#111827' : '#9ca3af',
              borderColor:
                summary && !isExportBusy ? '#d1d5db' : '#e5e7eb',
              opacity: summary && !isExportBusy ? 1 : 0.7,
              cursor: summary && !isExportBusy ? 'pointer' : 'not-allowed',
            }}
          >
            {isExportingImage ? '导出图片...' : '保存图片'}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!summary || isExportBusy}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '10px 16px',
              backgroundColor:
                summary && !isExportBusy ? '#ffffff' : '#f3f4f6',
              color: summary && !isExportBusy ? '#111827' : '#9ca3af',
              borderColor:
                summary && !isExportBusy ? '#d1d5db' : '#e5e7eb',
              opacity: summary && !isExportBusy ? 1 : 0.7,
              cursor:
                summary && !isExportBusy ? 'pointer' : 'not-allowed',
            }}
          >
            {isExportingPdf ? '导出 PDF...' : '保存为 PDF'}
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
      {actionSheetNode}
    </main>
  )
}
