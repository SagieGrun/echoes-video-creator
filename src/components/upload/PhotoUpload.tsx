'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'

interface PhotoUploadProps {
  onPhotoSelected: (file: File) => void
  maxSize?: number // in bytes
  acceptedTypes?: string[]
}

export function PhotoUpload({ 
  onPhotoSelected,
  maxSize = 5 * 1024 * 1024, // 5MB default
  acceptedTypes = ['image/jpeg', 'image/png']
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    const file = acceptedFiles[0]
    
    if (!file) return

    // Validate file size
    if (file.size > maxSize) {
      setError(`File is too large. Maximum size is ${maxSize / 1024 / 1024}MB`)
      return
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    onPhotoSelected(file)

    // Cleanup preview URL when component unmounts
    return () => URL.revokeObjectURL(objectUrl)
  }, [maxSize, onPhotoSelected])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
    multiple: false
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive 
            ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-purple-50' 
            : 'border-orange-200 hover:border-orange-300'
          }
        `}
      >
        <input {...getInputProps()} />
        
        {preview ? (
          <div className="relative aspect-square max-w-md mx-auto">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain rounded-lg"
            />
            <div className="absolute inset-0 bg-black/5 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <p className="text-white bg-black/50 px-4 py-2 rounded-full text-sm">
                Click or drag to replace
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-orange-600">
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop your photo here' : 'Drag and drop your photo here'}
              </p>
              <p className="text-sm mt-2">or</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-orange-500 to-purple-500 hover:from-orange-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-300 transform hover:scale-105"
            >
              Choose a file
            </button>
            <p className="text-xs text-orange-500">
              Supported formats: JPG, PNG (max {maxSize / 1024 / 1024}MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  )
} 