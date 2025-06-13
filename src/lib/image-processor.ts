import sharp from 'sharp'

// Gen-4 Turbo supported aspect ratios from Runway documentation
export const SUPPORTED_RATIOS = {
  // Landscape
  'landscape_hd': { width: 1280, height: 720, ratio: '1280:720' },
  'landscape_wide': { width: 1584, height: 672, ratio: '1584:672' },
  'landscape_cinematic': { width: 1104, height: 832, ratio: '1104:832' },
  // Portrait  
  'portrait_hd': { width: 720, height: 1280, ratio: '720:1280' },
  'portrait_tall': { width: 832, height: 1104, ratio: '832:1104' },
  // Square
  'square': { width: 960, height: 960, ratio: '960:960' }
} as const

export type SupportedRatio = keyof typeof SUPPORTED_RATIOS

export interface ImageMetadata {
  width: number
  height: number
  aspectRatio: number
  format: string
  size: number
}

export interface ProcessedImage {
  buffer: Buffer
  metadata: ImageMetadata
  targetRatio: string
  cropped: boolean
}

export async function analyzeImage(imageBuffer: Buffer): Promise<ImageMetadata> {
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to determine image dimensions')
  }

  return {
    width: metadata.width,
    height: metadata.height,
    aspectRatio: metadata.width / metadata.height,
    format: metadata.format || 'unknown',
    size: metadata.size || imageBuffer.length
  }
}

export function findBestRatio(aspectRatio: number): SupportedRatio {
  const ratios = Object.entries(SUPPORTED_RATIOS).map(([key, value]) => ({
    key: key as SupportedRatio,
    targetRatio: value.width / value.height,
    difference: Math.abs(aspectRatio - (value.width / value.height))
  }))

  // Sort by smallest difference to find closest match
  ratios.sort((a, b) => a.difference - b.difference)
  
  return ratios[0].key
}

export async function processImageForRunway(
  imageBuffer: Buffer,
  maxFileSize: number = 16 * 1024 * 1024 // 16MB limit from Runway docs
): Promise<ProcessedImage> {
  console.log('[IMAGE] Starting image processing for Runway:', {
    originalSize_mb: (imageBuffer.length / 1024 / 1024).toFixed(2),
    maxFileSize_mb: (maxFileSize / 1024 / 1024).toFixed(0)
  })
  
  const metadata = await analyzeImage(imageBuffer)
  
  console.log('[IMAGE] Image analysis complete:', {
    width: metadata.width,
    height: metadata.height,
    aspectRatio: metadata.aspectRatio.toFixed(3),
    format: metadata.format,
    size_mb: (metadata.size / 1024 / 1024).toFixed(2)
  })
  
  // Check file size limit
  if (metadata.size > maxFileSize) {
    const errorMsg = `Image file size ${(metadata.size / 1024 / 1024).toFixed(1)}MB exceeds maximum allowed size of ${maxFileSize / 1024 / 1024}MB`
    console.error('[IMAGE] ERROR: File size too large:', { 
      actualSize_mb: (metadata.size / 1024 / 1024).toFixed(2),
      maxSize_mb: (maxFileSize / 1024 / 1024).toFixed(0)
    })
    throw new Error(errorMsg)
  }

  // Find best matching ratio
  const bestRatioKey = findBestRatio(metadata.aspectRatio)
  const targetDimensions = SUPPORTED_RATIOS[bestRatioKey]
  
  console.log('[IMAGE] Best ratio match found:', {
    bestRatioKey,
    targetDimensions: `${targetDimensions.width}x${targetDimensions.height}`,
    targetRatio: targetDimensions.ratio
  })
  
  // Check if image already matches target ratio (within 1% tolerance)
  const currentRatio = metadata.width / metadata.height
  const targetRatio = targetDimensions.width / targetDimensions.height
  const tolerance = 0.01
  const ratioDifference = Math.abs(currentRatio - targetRatio)
  
  console.log('[IMAGE] Ratio comparison:', {
    currentRatio: currentRatio.toFixed(3),
    targetRatio: targetRatio.toFixed(3),
    difference: ratioDifference.toFixed(4),
    tolerance,
    needsCropping: ratioDifference > tolerance
  })
  
  if (ratioDifference <= tolerance) {
    console.log('[IMAGE] Image already matches target ratio, just resizing')
    
    // Image already has correct ratio, just resize if needed
    const processedBuffer = await sharp(imageBuffer)
      .resize(targetDimensions.width, targetDimensions.height, {
        fit: 'fill',
        withoutEnlargement: false
      })
      .jpeg({ quality: 90 })
      .toBuffer()
      
    console.log('[IMAGE] Resize completed:', {
      newSize_mb: (processedBuffer.length / 1024 / 1024).toFixed(2)
    })

    return {
      buffer: processedBuffer,
      metadata: {
        ...metadata,
        width: targetDimensions.width,
        height: targetDimensions.height,
        aspectRatio: targetRatio
      },
      targetRatio: targetDimensions.ratio,
      cropped: false
    }
  }

  // Need to crop from center to match target ratio
  console.log('[IMAGE] Cropping image from center to match target ratio')
  
  const processedBuffer = await sharp(imageBuffer)
    .resize(targetDimensions.width, targetDimensions.height, {
      fit: 'cover', // This crops from center
      position: 'center'
    })
    .jpeg({ quality: 90 })
    .toBuffer()

  console.log('[IMAGE] Cropping completed:', {
    newSize_mb: (processedBuffer.length / 1024 / 1024).toFixed(2),
    sizeDifference_mb: ((processedBuffer.length - imageBuffer.length) / 1024 / 1024).toFixed(2)
  })

  const processedMetadata = await analyzeImage(processedBuffer)

  return {
    buffer: processedBuffer,
    metadata: processedMetadata,
    targetRatio: targetDimensions.ratio,
    cropped: true
  }
}

export function getRatioInfo(ratioKey: SupportedRatio) {
  const ratio = SUPPORTED_RATIOS[ratioKey]
  const orientation = ratioKey.includes('portrait') ? 'Portrait' : 
                     ratioKey.includes('landscape') ? 'Landscape' : 'Square'
  
  return {
    ...ratio,
    orientation,
    description: `${orientation} ${ratio.width}×${ratio.height}`
  }
}

export async function validateImageForRunway(imageBuffer: Buffer): Promise<{
  valid: boolean
  errors: string[]
  warnings: string[]
  suggestedRatio?: string
}> {
  const errors: string[] = []
  const warnings: string[] = []
  
  try {
    const metadata = await analyzeImage(imageBuffer)
    
    // Check file size (16MB limit)
    if (metadata.size > 16 * 1024 * 1024) {
      errors.push(`File size ${(metadata.size / 1024 / 1024).toFixed(1)}MB exceeds 16MB limit`)
    }
    
    // Check format
    if (!['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format.toLowerCase())) {
      errors.push(`Unsupported format: ${metadata.format}. Use JPEG, PNG, or WebP`)
    }
    
    // Check dimensions (reasonable limits)
    if (metadata.width < 100 || metadata.height < 100) {
      errors.push('Image too small. Minimum 100×100 pixels recommended')
    }
    
    if (metadata.width > 4096 || metadata.height > 4096) {
      warnings.push('Very large image. Consider resizing to improve processing speed')
    }
    
    // Find suggested ratio
    const bestRatio = findBestRatio(metadata.aspectRatio)
    const suggestedRatioInfo = getRatioInfo(bestRatio)
    
    // Check if cropping will be significant
    const currentRatio = metadata.aspectRatio
    const targetRatio = SUPPORTED_RATIOS[bestRatio].width / SUPPORTED_RATIOS[bestRatio].height
    const ratioDifference = Math.abs(currentRatio - targetRatio) / currentRatio
    
    if (ratioDifference > 0.2) {
      warnings.push(`Image will be significantly cropped to fit ${suggestedRatioInfo.description} format`)
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestedRatio: suggestedRatioInfo.description
    }
  } catch (error) {
    errors.push(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { valid: false, errors, warnings }
  }
} 