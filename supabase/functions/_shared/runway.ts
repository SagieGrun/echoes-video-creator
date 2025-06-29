// Corrected Runway service following official API documentation
// Based on: https://docs.dev.runwayml.com/guides/using-the-api/
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Declare Deno environment for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

// Gen-4 Turbo supported aspect ratios from Runway documentation
const SUPPORTED_RATIOS = {
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

type SupportedRatio = keyof typeof SUPPORTED_RATIOS
type RunwayRatio = '1280:720' | '1584:672' | '1104:832' | '720:1280' | '832:1104' | '960:960'

/**
 * Analyze image from URL to get dimensions and aspect ratio
 */
async function analyzeImageFromUrl(imageUrl: string): Promise<{ width: number; height: number; aspectRatio: number }> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }
    
    const imageBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(imageBuffer)
    
    // Simple image dimension detection for JPEG and PNG
    let width = 0
    let height = 0
    
    // Check if it's a JPEG
    if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
      // JPEG format
      for (let i = 2; i < uint8Array.length - 4; i++) {
        if (uint8Array[i] === 0xFF && uint8Array[i + 1] === 0xC0) {
          height = (uint8Array[i + 5] << 8) | uint8Array[i + 6]
          width = (uint8Array[i + 7] << 8) | uint8Array[i + 8]
          break
        }
      }
    }
    // Check if it's a PNG
    else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
      // PNG format - dimensions are at bytes 16-23
      width = (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19]
      height = (uint8Array[20] << 24) | (uint8Array[21] << 16) | (uint8Array[22] << 8) | uint8Array[23]
    }
    
    if (width === 0 || height === 0) {
      throw new Error('Could not determine image dimensions')
    }
    
    return {
      width,
      height,
      aspectRatio: width / height
    }
  } catch (error) {
    console.error('Error analyzing image:', error)
    throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Find the best matching Runway ratio for the given aspect ratio
 */
function findBestRatio(aspectRatio: number): RunwayRatio {
  // Determine orientation first
  const isPortrait = aspectRatio < 0.9  // Less than 0.9 is clearly portrait
  const isSquare = aspectRatio >= 0.9 && aspectRatio <= 1.1  // Between 0.9 and 1.1 is square-ish
  const isLandscape = aspectRatio > 1.1  // Greater than 1.1 is clearly landscape

  // Filter ratios by orientation
  let candidates: Array<{key: SupportedRatio, ratio: RunwayRatio, targetRatio: number}> = []
  
  if (isPortrait) {
    // For portrait images, only consider portrait ratios
    candidates = [
      { key: 'portrait_hd', ratio: '720:1280', targetRatio: 720/1280 },      // 0.5625 (9:16)
      { key: 'portrait_tall', ratio: '832:1104', targetRatio: 832/1104 }     // 0.754 (3:4)
    ]
  } else if (isLandscape) {
    // For landscape images, only consider landscape ratios
    candidates = [
      { key: 'landscape_hd', ratio: '1280:720', targetRatio: 1280/720 },           // 1.778 (16:9)
      { key: 'landscape_wide', ratio: '1584:672', targetRatio: 1584/672 },         // 2.357 (ultra-wide)
      { key: 'landscape_cinematic', ratio: '1104:832', targetRatio: 1104/832 }     // 1.327 (4:3-ish)
    ]
  } else {
    // For square-ish images, use square
    return '960:960'
  }

  // Find the closest match within the orientation
  const bestMatch = candidates.reduce((best, current) => {
    const currentDiff = Math.abs(aspectRatio - current.targetRatio)
    const bestDiff = Math.abs(aspectRatio - best.targetRatio)
    return currentDiff < bestDiff ? current : best
  })

  console.log(`[RATIO] Selected ${bestMatch.ratio} for aspect ratio ${aspectRatio.toFixed(3)} (${isPortrait ? 'portrait' : isLandscape ? 'landscape' : 'square'})`)

  return bestMatch.ratio
}

interface GenerateVideoParams {
  image_url: string
  prompt: string
  duration?: number
}

interface RunwayTask {
  id: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  progress?: number
  failure_code?: string
  failure_reason?: string
  output?: string[]
  created_at: string
  started_at?: string
  ended_at?: string
}

interface VideoGenerationResult {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  video_url?: string
  error_message?: string
  estimated_time?: number
}

class RunwayService {
  private readonly apiKey: string
  // ✅ CORRECT API ENDPOINT from docs
  private readonly baseUrl = 'https://api.dev.runwayml.com/v1'
  // ✅ CORRECT API VERSION from docs
  private readonly apiVersion = '2024-11-06'

  constructor() {
    // ✅ CORRECT environment variable name from docs
    const apiKey = Deno.env.get('RUNWAYML_API_SECRET')
    if (!apiKey) {
      throw new Error('RUNWAYML_API_SECRET environment variable is required')
    }
    this.apiKey = apiKey
  }

  async generateVideo({ image_url, prompt, duration = 5 }: GenerateVideoParams): Promise<VideoGenerationResult> {
    const requestId = Math.random().toString(36).substring(2, 15)
    
    try {
      console.log(`[${requestId}] Starting Runway Gen-4 Turbo generation`)

      // Step 1: Analyze image to determine optimal aspect ratio
      console.log(`[${requestId}] Step 1: Analyzing image dimensions`)
      let optimalRatio: RunwayRatio = '1280:720' // Default fallback
      
      try {
        const imageAnalysis = await analyzeImageFromUrl(image_url)
        optimalRatio = findBestRatio(imageAnalysis.aspectRatio)
        
        console.log(`[${requestId}] Image analysis complete:`, {
          width: imageAnalysis.width,
          height: imageAnalysis.height,
          aspectRatio: imageAnalysis.aspectRatio.toFixed(3),
          optimalRatio,
          orientation: imageAnalysis.aspectRatio > 1 ? 'landscape' : imageAnalysis.aspectRatio < 1 ? 'portrait' : 'square'
        })
      } catch (analysisError) {
        console.warn(`[${requestId}] Image analysis failed, using default landscape ratio:`, analysisError)
        // Continue with default ratio
      }

      // Step 2: Prepare API request with optimal ratio
      const requestBody = {
        model: 'gen4_turbo',
        promptImage: image_url, // Direct URL - no processing needed
        promptText: prompt,
        ratio: optimalRatio, // Use detected optimal ratio
        duration: 5 // Gen-4 Turbo supports 5s or 10s
      }

      console.log(`[${requestId}] Step 3: Submitting to Runway API with optimal ratio:`, {
        url: `${this.baseUrl}/image_to_video`,
        body: {
          model: requestBody.model,
          promptText: requestBody.promptText.substring(0, 100) + (requestBody.promptText.length > 100 ? '...' : ''),
          ratio: requestBody.ratio,
          duration: requestBody.duration,
          promptImage: requestBody.promptImage.substring(0, 100) + '...' // Truncate for logging
        },
        headers: {
          'Authorization': 'Bearer [REDACTED]',
          'X-Runway-Version': this.apiVersion
        }
      })
      
      console.log(`[${requestId}] Full promptImage URL:`, requestBody.promptImage)

      const response = await fetch(`${this.baseUrl}/image_to_video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ✅ CORRECT: Authorization header format from docs
          'Authorization': `Bearer ${this.apiKey}`,
          // ✅ CORRECT: Version header from docs  
          'X-Runway-Version': this.apiVersion
        },
        body: JSON.stringify(requestBody)
      })

      console.log(`[${requestId}] Response status:`, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[${requestId}] API Error:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`Runway API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log(`[${requestId}] Task created:`, result)

      return {
        task_id: result.id,
        status: 'pending',
        progress: 0,
        estimated_time: 120 // 2 minutes estimate
      }

    } catch (error) {
      console.error(`[${requestId}] Generation failed:`, error)
      return {
        task_id: '',
        status: 'failed',
        progress: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getJobStatus(taskId: string): Promise<VideoGenerationResult> {
    try {
      console.log(`[STATUS] Checking task: ${taskId}`)

      // ✅ CORRECT: Task status endpoint from docs
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': this.apiVersion
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[STATUS] API Error:`, {
          status: response.status,
          body: errorText
        })
        throw new Error(`Status check failed: ${response.status} - ${errorText}`)
      }

      const task: RunwayTask = await response.json()
      console.log(`[STATUS] Task status:`, task)

      // ✅ CORRECT: Status mapping from docs
      const status = this.mapStatus(task.status)
      const progress = this.calculateProgress(task)
      
      let video_url: string | undefined
      if (task.status === 'SUCCEEDED' && task.output && task.output.length > 0) {
        video_url = task.output[0]
      }

      return {
        task_id: taskId,
        status,
        progress,
        video_url,
        error_message: task.failure_reason,
        estimated_time: this.getEstimatedTimeRemaining(task)
      }

    } catch (error) {
      console.error(`[STATUS] Status check failed:`, error)
      return {
        task_id: taskId,
        status: 'failed',
        progress: 0,
        error_message: error instanceof Error ? error.message : 'Status check failed'
      }
    }
  }

  // ✅ CORRECT: Map official Runway statuses
  private mapStatus(runwayStatus: string): VideoGenerationResult['status'] {
    switch (runwayStatus) {
      case 'PENDING':
        return 'pending'
      case 'RUNNING':
        return 'processing'
      case 'SUCCEEDED':
        return 'completed'
      case 'FAILED':
        return 'failed'
      default:
        return 'pending'
    }
  }

  private calculateProgress(task: RunwayTask): number {
    if (task.status === 'SUCCEEDED') return 100
    if (task.status === 'FAILED') return 0
    if (task.status === 'RUNNING') {
      // Estimate progress based on time elapsed
      if (task.started_at) {
        const startTime = new Date(task.started_at).getTime()
        const now = Date.now()
        const elapsed = (now - startTime) / 1000 // seconds
        
        // Gen-4 Turbo typically takes 60-120 seconds
        const estimatedTotal = 90 // seconds
        const progress = Math.min(90, (elapsed / estimatedTotal) * 100)
        return Math.round(progress)
      }
      return 20 // Default for running
    }
    return 0 // Pending
  }

  private getEstimatedTimeRemaining(task: RunwayTask): number {
    if (task.status === 'SUCCEEDED' || task.status === 'FAILED') return 0
    
    // Gen-4 Turbo typical generation time
    if (task.status === 'RUNNING' && task.started_at) {
      const startTime = new Date(task.started_at).getTime()
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = Math.max(0, 90 - elapsed) // 90 seconds typical
      return Math.round(remaining)
    }
    
    return 120 // Default estimate: 2 minutes
  }
}

export function createRunwayService(): RunwayService {
  return new RunwayService()
}

export type { VideoGenerationResult, GenerateVideoParams, RunwayTask } 