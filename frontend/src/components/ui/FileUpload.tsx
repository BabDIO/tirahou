import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection, type DropEvent } from 'react-dropzone'
import { Upload, X, FileText, Image, Film, Archive } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FileUploadProps {
  onFiles: (files: File[]) => void
  accept?: Record<string, string[]>
  maxSize?: number
  multiple?: boolean
  label?: string
}

const fileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />
  if (type.startsWith('video/')) return <Film className="w-5 h-5 text-purple-500" />
  if (type.includes('zip') || type.includes('archive')) return <Archive className="w-5 h-5 text-amber-500" />
  return <FileText className="w-5 h-5 text-gray-500" />
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUpload({
  onFiles, accept, maxSize = 10 * 1024 * 1024,
  multiple = false, label = 'Déposer vos fichiers ici',
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[], _event: DropEvent) => {
    setErrors([])
    if (rejected.length > 0) {
      setErrors(rejected.map((r: FileRejection) => `${r.file.name}: ${r.errors[0]?.message}`))
    }
    const newFiles = multiple ? [...files, ...accepted] : accepted
    setFiles(newFiles)
    onFiles(newFiles)
  }, [files, multiple, onFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept, maxSize, multiple,
  })

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    onFiles(updated)
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className={cn('w-10 h-10 mx-auto mb-3', isDragActive ? 'text-primary-500' : 'text-gray-400')} />
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 mt-1">
          ou cliquez pour sélectionner · Max {formatSize(maxSize)}
        </p>
      </div>

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">{e}</p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {fileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
              </div>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
