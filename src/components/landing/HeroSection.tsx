'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSmartLogin } from '@/hooks/useSmartLogin'

export function HeroSection() {
  const { handleSmartLogin, isLoading } = useSmartLogin()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showPlayButton, setShowPlayButton] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)

  // Comprehensive video diagnostics
  const logVideoState = (context: string) => {
    const video = videoRef.current
    if (!video) {
      console.log(`[${context}] Video element not found`)
      return
    }

    console.log(`[${context}] Video Diagnostics:`, {
      src: video.src,
      currentSrc: video.currentSrc,
      readyState: video.readyState,
      readyStateText: [
        'HAVE_NOTHING',
        'HAVE_METADATA', 
        'HAVE_CURRENT_DATA',
        'HAVE_FUTURE_DATA',
        'HAVE_ENOUGH_DATA'
      ][video.readyState],
      networkState: video.networkState,
      networkStateText: [
        'NETWORK_EMPTY',
        'NETWORK_IDLE', 
        'NETWORK_LOADING',
        'NETWORK_NO_SOURCE'
      ][video.networkState],
      error: video.error ? {
        code: video.error.code,
        message: video.error.message,
        codeText: [
          'MEDIA_ERR_ABORTED',
          'MEDIA_ERR_NETWORK',
          'MEDIA_ERR_DECODE', 
          'MEDIA_ERR_SRC_NOT_SUPPORTED'
        ][video.error.code - 1]
      } : null,
      canPlayType: {
        'video/mp4': video.canPlayType('video/mp4'),
        'video/mp4; codecs="avc1.42E01E"': video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
        'video/mp4; codecs="avc1.42001E"': video.canPlayType('video/mp4; codecs="avc1.42001E"'),
        'video/mp4; codecs="avc1.4D401E"': video.canPlayType('video/mp4; codecs="avc1.4D401E"')
      },
      duration: video.duration,
      paused: video.paused,
      ended: video.ended,
      seeking: video.seeking,
      buffered: video.buffered.length > 0 ? `${video.buffered.start(0)}-${video.buffered.end(0)}` : 'none'
    })
  }

  // Test network connectivity to the video file
  const testVideoUrl = async () => {
    const videoUrl = '/examples/family-photo-animated-square.mp4'
    console.log('[Network Test] Testing video URL accessibility...')
    
    try {
      const response = await fetch(videoUrl, { method: 'HEAD' })
      console.log('[Network Test] Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok
      })
      
      if (response.ok) {
        // Try to fetch a small range to test actual video data
        const rangeResponse = await fetch(videoUrl, {
          headers: { 'Range': 'bytes=0-1023' }
        })
        const buffer = await rangeResponse.arrayBuffer()
        console.log('[Network Test] Video data accessible:', {
          rangeStatus: rangeResponse.status,
          bytesReceived: buffer.byteLength,
          firstBytes: Array.from(new Uint8Array(buffer.slice(0, 16))).map(b => b.toString(16).padStart(2, '0')).join(' ')
        })
      }
    } catch (error) {
      console.error('[Network Test] Failed to access video URL:', error)
    }
  }

  // Handle video autoplay with comprehensive logging
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    console.log('[Video Init] Starting video setup...')
    logVideoState('Init')
    testVideoUrl()

    const handleLoadStart = () => {
      console.log('[Video Event] Load started')
      logVideoState('LoadStart')
    }

    const handleLoadedMetadata = () => {
      console.log('[Video Event] Metadata loaded')
      logVideoState('LoadedMetadata')
    }

    const handleLoadedData = () => {
      console.log('[Video Event] Data loaded')
      logVideoState('LoadedData')
    }

    const handleCanPlay = () => {
      console.log('[Video Event] Can play')
      logVideoState('CanPlay')
      attemptAutoplay()
    }

    const handleCanPlayThrough = () => {
      console.log('[Video Event] Can play through')
      logVideoState('CanPlayThrough')
    }

    const handleError = (e: Event) => {
      console.error('[Video Event] Error occurred:', e)
      logVideoState('Error')
      setShowPlayButton(true)
    }

    const handlePlay = () => {
      console.log('[Video Event] Play started')
      setVideoPlaying(true)
      setShowPlayButton(false)
      logVideoState('Play')
    }

    const handlePause = () => {
      console.log('[Video Event] Paused')
      setVideoPlaying(false)
      logVideoState('Pause')
    }

    const handleWaiting = () => {
      console.log('[Video Event] Waiting for data')
      logVideoState('Waiting')
    }

    const handleSuspend = () => {
      console.log('[Video Event] Loading suspended')
      logVideoState('Suspend')
    }

    const handleStalled = () => {
      console.log('[Video Event] Loading stalled')
      logVideoState('Stalled')
    }

    const attemptAutoplay = async () => {
      if (!video) return
      
      console.log('[Autoplay] Attempting autoplay...')
      logVideoState('BeforeAutoplay')
      
      try {
        const playPromise = video.play()
        console.log('[Autoplay] Play promise created:', playPromise)
        
        await playPromise
        console.log('[Autoplay] SUCCESS - Video is playing')
        setShowPlayButton(false)
        setVideoPlaying(true)
      } catch (error) {
        const errorName = (error as any)?.name || 'Unknown';
        if (errorName === 'NotAllowedError') {
          console.log('[Autoplay] Blocked by browser policy - showing play button')
        } else {
          console.error('[Autoplay] FAILED:', {
            error,
            errorName,
            errorMessage: (error as any)?.message,
            errorCode: (error as any)?.code
          })
        }
        logVideoState('AutoplayFailed')
        setShowPlayButton(true)
        setVideoPlaying(false)
      }
    }

    // Set up all event listeners
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('canplaythrough', handleCanPlayThrough)
    video.addEventListener('error', handleError)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('suspend', handleSuspend)
    video.addEventListener('stalled', handleStalled)

    // Try autoplay immediately if already loaded
    if (video.readyState >= 3) { // HAVE_FUTURE_DATA
      console.log('[Video Init] Video already loaded, attempting autoplay')
      attemptAutoplay()
    }

    // Intersection Observer for autoplay when visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          console.log('[Intersection] Video visibility changed:', {
            isIntersecting: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            videoPlaying,
            showPlayButton
          })
          if (entry.isIntersecting && !videoPlaying && !showPlayButton) {
            console.log('[Intersection] Attempting autoplay on scroll into view')
            attemptAutoplay()
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(video)

    return () => {
      console.log('[Video Cleanup] Removing event listeners')
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('canplaythrough', handleCanPlayThrough)
      video.removeEventListener('error', handleError)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('suspend', handleSuspend)
      video.removeEventListener('stalled', handleStalled)
      observer.disconnect()
    }
  }, [videoPlaying, showPlayButton])

  const handlePlayClick = async () => {
    const video = videoRef.current
    if (!video) return

    console.log('[Manual Play] User clicked play button')
    logVideoState('BeforeManualPlay')

    try {
      const playPromise = video.play()
      console.log('[Manual Play] Play promise created:', playPromise)
      
      await playPromise
      console.log('[Manual Play] SUCCESS - Video is playing')
      setShowPlayButton(false)
      setVideoPlaying(true)
    } catch (error) {
             console.error('[Manual Play] FAILED:', {
         error,
         errorName: (error as any)?.name,
         errorMessage: (error as any)?.message,
         errorCode: (error as any)?.code
       })
      logVideoState('ManualPlayFailed')
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden pt-16">
      {/* Background with new color scheme */}
      <div className="absolute inset-0 section-soft">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Main Content */}
          <div className="text-center lg:text-left">
            {/* Main Headline with Logo */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-6 leading-tight text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-6 mb-2">
                <span>Bring Your</span>
                <img 
                  src="echoes-logo.png" 
                  alt="Echoes Logo" 
                  className="h-12 w-12 md:h-16 md:w-16 lg:h-20 lg:w-20"
                />
              </div>
              <span className="block">
                Memories to <span className="bg-gradient-to-r from-accent-coral to-accent-teal bg-clip-text text-transparent">Life</span>
              </span>
            </h2>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-secondary mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Transform your cherished photos into magical AI-animated videos. 
              Perfect for creating heartfelt gifts.
            </p>

            {/* Primary CTA */}
            <div className="mb-8 text-center lg:text-left">
              <button 
                onClick={handleSmartLogin}
                disabled={isLoading}
                className="btn-gradient text-lg px-8 py-4 shadow-lg hover:shadow-xl mb-4"
              >
                {isLoading ? 'Loading...' : 'Try Your First Clip FREE'}
              </button>
              
              <p className="text-secondary text-base font-medium">
                💳 No credit card required
              </p>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-8 text-primary text-base">
              <div className="flex items-center gap-3">
                <span className="text-accent-teal text-lg">🔒</span>
                <span className="font-medium">Privacy-first</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-accent-teal text-lg">🚀</span>
                <span className="font-medium">Ready in 2 minutes</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-accent-teal text-lg">⚡</span>
                <span className="font-medium">Professional quality</span>
              </div>
            </div>
          </div>

          {/* Right Side - Before/After Demo */}
          <div className="lg:order-last">
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-light-border relative shadow-xl">
              <h3 className="text-xl font-semibold text-primary mb-6 text-center">
                Watch the <span className="bg-gradient-to-r from-accent-coral to-accent-teal bg-clip-text text-transparent">Magic</span> Happen 🎬
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Before - Static Photo */}
                <div className="text-center">
                  <div className="bg-white rounded-2xl p-2 shadow-lg mb-4">
                    <div className="aspect-square relative overflow-hidden rounded-xl">
                      <img
                        src="examples/family-photo.jpg"
                        alt="Beautiful family memory - grandparents with baby"
                        className="w-full h-full object-cover"
                      />
                      {/* Static indicator */}
                      <div className="absolute top-3 right-3 bg-subtle-gray text-white text-sm px-3 py-1 rounded-full font-medium">
                        Static
                      </div>
                    </div>
                  </div>
                  <p className="text-secondary font-medium">BEFORE</p>
                </div>

                {/* After - Animated Video */}
                <div className="text-center">
                  <div className="bg-white rounded-2xl p-2 shadow-lg mb-4 relative">
                    <div className="aspect-square relative overflow-hidden rounded-xl">
                      <video
                        ref={videoRef}
                        src="/examples/family-photo-animated-square.mp4"
                        poster="/examples/family-photo.jpg"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        controls={false}
                        disablePictureInPicture
                        className="w-full h-full object-cover"
                        onLoadedData={() => {
                          const video = videoRef.current;
                          if (video) {
                            video.play().catch(() => {
                              // Autoplay failed, show play button
                              setShowPlayButton(true);
                            });
                          }
                        }}
                      />
                      
                      {/* Play button overlay for when autoplay fails */}
                      {showPlayButton && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                          <button
                            onClick={handlePlayClick}
                            className="bg-accent-coral hover:bg-accent-coral/90 text-white rounded-full p-4 shadow-lg transition-all duration-200 transform hover:scale-110"
                            aria-label="Play video"
                          >
                            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </button>
                        </div>
                      )}
                      
                      {/* Animated indicator */}
                      <div className="absolute top-3 right-3 bg-accent-coral text-white text-sm px-3 py-1 rounded-full flex items-center gap-2 font-medium">
                        {videoPlaying ? (
                          <>
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            Live
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            Ready
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-accent-coral font-medium">AFTER</p>
                </div>
              </div>

              {/* Arrow between before/after */}
              <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="bg-accent-coral text-white rounded-full p-3 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>

              <div className="text-center mt-6">
                <p className="text-primary text-base font-medium">
                  {showPlayButton ? '▶️ Click to see the magic in action!' : '🎬 Real family memories brought to life with gentle, natural animation'}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Social Proof - moved down to fill the space left by removed scroll indicator */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 text-center">
        <div className="flex justify-center items-center gap-1 mb-3">
          {[1,2,3,4,5].map((star) => (
            <span key={star} className="text-accent-coral text-xl">★</span>
          ))}
        </div>
        <p className="text-primary text-base font-medium">
          Loved by families worldwide
        </p>
      </div>


    </section>
  )
} 