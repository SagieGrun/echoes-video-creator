import { AIVideoProvider } from '@/types'
import { ModelConfig } from './base'
import { processImageForRunway } from '../image-processor'

export class KlingProvider implements AIVideoProvider {
  private config: ModelConfig
  private baseUrl = 'https://api.aimlapi.com/v2/generate/video/kling'
  private apiKey: string

  constructor(config: ModelConfig) {
    this.config = config
    this.apiKey = process.env.AIMLAPI_API_KEY || config.apiKey || ''
  }

  // Helper method to fetch image buffer from URL
  private async fetchImageBuffer(imageUrl: string): Promise<Buffer> {
    console.log('[KLING-IMAGE] Downloading image from URL')
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log('[KLING-IMAGE] Image downloaded successfully:', {
      size_mb: (buffer.length / 1024 / 1024).toFixed(2),
      size_bytes: buffer.length
    })
    
    return buffer
  }

  // Helper method to convert processed image to data URI
  private async uploadProcessedImage(imageBuffer: Buffer): Promise<string> {
    console.log('[KLING-IMAGE] Converting processed image to data URI')
    const base64 = imageBuffer.toString('base64')
    const dataUri = `data:image/jpeg;base64,${base64}`
    
    console.log('[KLING-IMAGE] Data URI created:', {
      size_mb: (imageBuffer.length / 1024 / 1024).toFixed(2),
      dataUri_length: dataUri.length
    })
    
    return dataUri
  }

  async generateClip(imageUrl: string, prompt?: string): Promise<string> {
    const requestId = Math.random().toString(36).substring(2, 15)
    
    try {
      console.log(`[KLING-${requestId}] Starting Kling V2 generation with image processing:`, {
        imageUrl: imageUrl.substring(0, 100) + '...',
        prompt: prompt?.substring(0, 100) + (prompt && prompt.length > 100 ? '...' : ''),
        duration: this.config.options?.duration || 5,
        timestamp: new Date().toISOString()
      })

      // Step 1: Download and validate image
      console.log(`[KLING-${requestId}] Step 1: Downloading image from URL`)
      const imageBuffer = await this.fetchImageBuffer(imageUrl)

      // Step 2: Process image for optimal AI generation
      console.log(`[KLING-${requestId}] Step 2: Processing image for optimal quality`)
      const processedImage = await processImageForRunway(imageBuffer)
      
      console.log(`[KLING-${requestId}] Image processed successfully:`, {
        targetRatio: processedImage.targetRatio,
        cropped: processedImage.cropped,
        originalSize: (imageBuffer.length / 1024 / 1024).toFixed(2) + 'MB',
        processedSize: (processedImage.buffer.length / 1024 / 1024).toFixed(2) + 'MB',
        aspectRatio: processedImage.metadata.aspectRatio.toFixed(3)
      })

      // Step 3: Convert processed image to data URI
      console.log(`[KLING-${requestId}] Step 3: Converting to data URI for API`)
      const processedImageUrl = await this.uploadProcessedImage(processedImage.buffer)

      const requestBody = {
        model: 'klingai/v2-master-image-to-video',
        prompt: prompt || this.config.defaultPrompt,
        first_frame_image: processedImageUrl, // Use processed image
        duration: this.config.options?.duration || 5
      }

      console.log(`[KLING-${requestId}] API request with processed image:`, {
        url: `${this.baseUrl}/generation`,
        body: {
          model: requestBody.model,
          prompt: requestBody.prompt.substring(0, 100) + (requestBody.prompt.length > 100 ? '...' : ''),
          duration: requestBody.duration,
          first_frame_image_type: 'data_uri',
          first_frame_image_size: requestBody.first_frame_image.length,
          processedImageInfo: {
            targetRatio: processedImage.targetRatio,
            wasCropped: processedImage.cropped
          }
        }
      })

      const startTime = Date.now()
      const response = await fetch(`${this.baseUrl}/generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      const apiCallDuration = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[KLING-${requestId}] API Error:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          apiCallDuration
        })
        throw new Error(`Kling API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log(`[KLING-${requestId}] Generation started successfully:`, {
        generationId: result.generation_id,
        apiCallDuration,
        imageProcessingInfo: {
          originalAspectRatio: (imageBuffer.length > 0 ? 'processed' : 'unknown'),
          finalAspectRatio: processedImage.targetRatio,
          wasCropped: processedImage.cropped
        }
      })

      return result.generation_id // This is the job ID
    } catch (error) {
      console.error(`[KLING-${requestId}] Generation failed:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })
      throw error
    }
  }

  async getJobStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed'
    result_url?: string
    error_message?: string
  }> {
    const startTime = Date.now()
    
    try {
      console.log(`[KLING-STATUS] Checking generation status:`, { 
        jobId, 
        timestamp: new Date().toISOString() 
      })

      const response = await fetch(`${this.baseUrl}/generation?generation_id=${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      const apiCallDuration = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[KLING-STATUS] API Error:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          apiCallDuration
        })
        throw new Error(`Kling status check failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log(`[KLING-STATUS] Status response:`, {
        jobId,
        status: result.status,
        hasVideo: !!result.video?.url,
        apiCallDuration,
        response: result
      })

      // Map Kling status to our internal status
      let status: 'pending' | 'processing' | 'completed' | 'failed'
      switch (result.status) {
        case 'completed':
          status = 'completed'
          break
        case 'processing':
          status = 'processing'
          break
        case 'failed':
          status = 'failed'
          break
        default:
          status = 'pending'
      }

      return {
        status,
        result_url: result.video?.url,
        error_message: result.error || result.failure_reason
      }
    } catch (error) {
      const apiCallDuration = Date.now() - startTime
      console.error(`[KLING-STATUS] Status check failed:`, {
        jobId,
        error: error instanceof Error ? error.message : String(error),
        apiCallDuration,
        timestamp: new Date().toISOString()
      })
      
      return {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Status check failed'
      }
    }
  }
} 