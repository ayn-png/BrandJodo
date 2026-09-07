import { useRef } from 'react'
import { Button, Spinner } from '@/components/ui'

interface ImagePickerProps {
  label: string
  url: string | null | undefined
  onUpload: (file: File) => Promise<void>
  onRemove?: () => Promise<void>
  uploading?: boolean
  className?: string
}

export function ImagePicker({
  label,
  url,
  onUpload,
  onRemove,
  uploading = false,
  className,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await onUpload(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={className}>
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      <div className="mt-2 flex items-center gap-4">
        {url ? (
          <img
            src={url}
            alt={label}
            className="h-20 w-20 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
            No image
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading && <Spinner className="h-4 w-4" />}
            {url ? 'Replace' : 'Upload image'}
          </Button>
          {url && onRemove && (
            <Button
              type="button"
              variant="ghost"
              onClick={onRemove}
              disabled={uploading}
              className="text-red-600 hover:bg-red-50"
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
