'use client'

import { useCallback, useState } from 'react'
import { trpc } from '@/lib/trpc/client'

interface FileUploadZoneProps {
  presentationId: string
  onUploadComplete?: () => void
}

interface UploadingFile {
  name: string
  size: number
  progress: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g. "data:application/pdf;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.csv,.md'

export function FileUploadZone({ presentationId, onUploadComplete }: FileUploadZoneProps) {
  const [files, setFiles] = useState<UploadingFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const uploadMutation = trpc.document.upload.useMutation()
  const deleteMutation = trpc.document.delete.useMutation()
  const { data: documents, refetch } = trpc.document.list.useQuery({ presentationId })

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles = Array.from(fileList)

      for (const file of newFiles) {
        const entry: UploadingFile = {
          name: file.name,
          size: file.size,
          progress: 0,
          status: 'uploading',
        }

        setFiles((prev) => [...prev, entry])

        try {
          const base64 = await fileToBase64(file)

          setFiles((prev) =>
            prev.map((f) => (f.name === file.name ? { ...f, progress: 50 } : f))
          )

          await uploadMutation.mutateAsync({
            base64,
            filename: file.name,
            presentationId,
          })

          setFiles((prev) =>
            prev.map((f) =>
              f.name === file.name ? { ...f, progress: 100, status: 'done' } : f
            )
          )

          await refetch()
          onUploadComplete?.()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed'
          setFiles((prev) =>
            prev.map((f) =>
              f.name === file.name ? { ...f, status: 'error', error: message } : f
            )
          )
        }
      }
    },
    [uploadMutation, presentationId, refetch, onUploadComplete]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = ACCEPTED_EXTENSIONS
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files.length > 0) {
        handleFiles(target.files)
      }
    }
    input.click()
  }, [handleFiles])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync({ id })
      await refetch()
    },
    [deleteMutation, refetch]
  )

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Drag &amp; drop files here, or click to select
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          PDF, DOCX, TXT, CSV, MD — max 10MB each
        </p>
      </div>

      {/* Upload progress */}
      {files.filter((f) => f.status === 'uploading').length > 0 && (
        <div className="space-y-2">
          {files
            .filter((f) => f.status === 'uploading')
            .map((file) => (
              <div key={file.name} className="flex items-center gap-2 text-sm">
                <span className="truncate flex-1">{file.name}</span>
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Error messages */}
      {files.filter((f) => f.status === 'error').length > 0 && (
        <div className="space-y-1">
          {files
            .filter((f) => f.status === 'error')
            .map((file) => (
              <p key={file.name} className="text-sm text-red-600">
                {file.name}: {file.error}
              </p>
            ))}
        </div>
      )}

      {/* Uploaded document chips */}
      {documents && documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
            >
              <span className="truncate max-w-[200px]">{doc.filename}</span>
              <span className="text-gray-400 text-xs">
                {formatFileSize(doc.file_size ?? 0)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(doc.id)
                }}
                className="text-gray-400 hover:text-red-500 ml-1"
                aria-label={`Remove ${doc.filename}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
