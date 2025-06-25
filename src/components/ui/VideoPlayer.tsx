'use client'

import { useState, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2 } from 'lucide-react'

interface VideoPlayerProps {
  src: string
  poster?: string
  className?: string
  thumbnailContent?: React.ReactNode
  autoPlay?: boolean
  showControls?: boolean
  thumbnailWithControls?: boolean // New prop: show thumbnail first, then native controls
  preload?: 'none' | 'metadata' | 'auto'
  aspectRatio?: string
  width?: number
  height?: number
}

export function VideoPlayer({ 
  src, 
  poster, 
  className = '', 
  thumbnailContent,
  autoPlay = false,
  showControls = false,
  thumbnailWithControls = false,
  preload = 'metadata',
  aspectRatio,
  width,
  height
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showVideo, setShowVideo] = useState(autoPlay)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayClick = async () => {
    if (!showVideo) {
      console.log('VideoPlayer: Showing video element and attempting to play', { src })
      setShowVideo(true)
      setIsLoading(true)
      setHasError(false)
      return
    }

    if (videoRef.current) {
      console.log('VideoPlayer: Attempting to play video', { 
        src: videoRef.current.src,
        readyState: videoRef.current.readyState,
        networkState: videoRef.current.networkState,
        currentTime: videoRef.current.currentTime,
        duration: videoRef.current.duration
      })
      
      try {
        setIsLoading(true)
        const playPromise = videoRef.current.play()
        
        if (playPromise !== undefined) {
          await playPromise
          console.log('VideoPlayer: Video play promise resolved successfully')
          setIsPlaying(true)
        }
      } catch (error) {
        console.error('VideoPlayer: Play promise rejected:', error)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleVideoLoad = () => {
    console.log('VideoPlayer: Video loaded successfully', {
      src: videoRef.current?.src,
      duration: videoRef.current?.duration,
      videoWidth: videoRef.current?.videoWidth,
      videoHeight: videoRef.current?.videoHeight
    })
    setIsLoading(false)
    setHasError(false)
  }

  const handleVideoLoadStart = () => {
    console.log('VideoPlayer: Video load started', { src })
    setIsLoading(true)
  }

  const handleVideoLoadedData = () => {
    console.log('VideoPlayer: Video data loaded', {
      src: videoRef.current?.src,
      readyState: videoRef.current?.readyState,
      networkState: videoRef.current?.networkState
    })
  }

  const handleVideoLoadedMetadata = () => {
    console.log('VideoPlayer: Video metadata loaded', {
      src: videoRef.current?.src,
      duration: videoRef.current?.duration,
      videoWidth: videoRef.current?.videoWidth,
      videoHeight: videoRef.current?.videoHeight
    })
  }

  const handleVideoCanPlay = () => {
    console.log('VideoPlayer: Video can play', { src })
    setIsLoading(false)
    
    // Auto-play if we just showed the video
    if (showVideo && !isPlaying && videoRef.current) {
      console.log('VideoPlayer: Auto-playing video after load')
      videoRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(error => {
        console.error('VideoPlayer: Auto-play failed:', error)
        setHasError(true)
      })
    }
  }

  const handleVideoWaiting = () => {
    console.log('VideoPlayer: Video waiting for data')
    setIsLoading(true)
  }

  const handleVideoPlaying = () => {
    console.log('VideoPlayer: Video is playing')
    setIsLoading(false)
    setIsPlaying(true)
  }

  const handleVideoPause = () => {
    console.log('VideoPlayer: Video paused')
    setIsPlaying(false)
  }

  const handleVideoStalled = () => {
    console.log('VideoPlayer: Video stalled')
    setIsLoading(true)
  }

  const handleVideoSuspend = () => {
    console.log('VideoPlayer: Video suspended')
  }

  const handleVideoAbort = () => {
    console.log('VideoPlayer: Video aborted')
    setHasError(true)
    setIsLoading(false)
  }

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget
    const error = video.error
    
    console.error('Video loading error:', e)
    console.error('Video error details:', {
      error: error,
      code: error?.code,
      message: error?.message,
      src: video.src,
      networkState: video.networkState,
      readyState: video.readyState,
      currentSrc: video.currentSrc
    })
    
    // Log network state meanings
    const networkStates = {
      0: 'NETWORK_EMPTY',
      1: 'NETWORK_IDLE', 
      2: 'NETWORK_LOADING',
      3: 'NETWORK_NO_SOURCE'
    }
    
    const errorCodes = {
      1: 'MEDIA_ERR_ABORTED',
      2: 'MEDIA_ERR_NETWORK', 
      3: 'MEDIA_ERR_DECODE',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
    }
    
    console.error('Network state:', networkStates[video.networkState as keyof typeof networkStates])
    console.error('Error code:', error?.code ? errorCodes[error.code as keyof typeof errorCodes] : 'Unknown')
    
    setHasError(true)
    setIsLoading(false)
  }

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen()
      }
    }
  }

  // Get container style with aspect ratio for layout shift prevention
  const getContainerStyle = () => {
    const baseStyle: React.CSSProperties = {}
    
    if (aspectRatio) {
      baseStyle.aspectRatio = aspectRatio
    } else if (width && height) {
      baseStyle.aspectRatio = `${width}/${height}`
    }
    
    return baseStyle
  }

  if (hasError) {
    return (
      <div className={`relative bg-gray-100 flex items-center justify-center ${className}`} style={getContainerStyle()}>
        <div className="text-center p-4">
          <div className="text-red-500 text-4xl mb-2">⚠️</div>
          <p className="text-sm text-gray-600">Unable to load video</p>
          <button
            onClick={() => {
              setHasError(false)
              setShowVideo(false)
            }}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // If thumbnailWithControls is true and video is playing, show native controls
  if (thumbnailWithControls && showVideo) {
    return (
      <div className={className} style={getContainerStyle()}>
        <video
          src={src}
          poster={poster}
          controls
          autoPlay={true} // Auto-play when switching from thumbnail to video
          className="w-full h-full object-cover"
          preload={preload}
          width={width}
          height={height}
          onError={(e) => {
            console.error('Video loading error:', e)
            setHasError(true)
          }}
        />
      </div>
    )
  }

  // If showControls is true, immediately show video with native controls
  if (showControls && !thumbnailWithControls) {
    return (
      <div className={className} style={getContainerStyle()}>
        <video
          src={src}
          poster={poster}
          controls
          className="w-full h-full object-cover"
          preload={preload}
          width={width}
          height={height}
          onError={(e) => {
            console.error('Video loading error:', e)
            setHasError(true)
          }}
        />
      </div>
    )
  }

  if (!showVideo) {
    return (
      <div className={`relative group cursor-pointer ${className}`} style={getContainerStyle()} onClick={handlePlayClick}>
        {thumbnailContent}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
            <Play className="h-8 w-8 text-gray-800 ml-1" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={getContainerStyle()}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
        </div>
      )}
      
      {showVideo && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="w-full h-full object-cover"
          width={width}
          height={height}
          preload={preload}
          muted={isMuted}
          onLoad={handleVideoLoad}
          onLoadStart={handleVideoLoadStart}
          onLoadedData={handleVideoLoadedData}
          onLoadedMetadata={handleVideoLoadedMetadata}
          onCanPlay={handleVideoCanPlay}
          onWaiting={handleVideoWaiting}
          onPlaying={handleVideoPlaying}
          onPause={handleVideoPause}
          onStalled={handleVideoStalled}
          onSuspend={handleVideoSuspend}
          onAbort={handleVideoAbort}
          onError={handleVideoError}
          onTimeUpdate={() => {
            if (videoRef.current && videoRef.current.currentTime > 0) {
              setIsPlaying(!videoRef.current.paused)
            }
          }}
        />
      )}
      
      {/* Custom controls overlay (optional) */}
      {!isLoading && (
        <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={toggleMute}
            className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
} 