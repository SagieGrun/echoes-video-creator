'use client'

import { useState } from 'react'

export function WhatYouGet() {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)

  // Photos for the grid - handle mixed file extensions
  const examplePhotos = [
    { id: 1, src: `/examples/photo-1.jpg`, alt: `Example photo 1` },
    { id: 2, src: `/examples/photo-2.jpg`, alt: `Example photo 2` },
    { id: 3, src: `/examples/photo-3.JPG`, alt: `Example photo 3` },
    { id: 4, src: `/examples/photo-4.JPG`, alt: `Example photo 4` },
    { id: 5, src: `/examples/photo-5.JPG`, alt: `Example photo 5` },
    { id: 6, src: `/examples/photo-6.JPG`, alt: `Example photo 6` },
    { id: 7, src: `/examples/photo-7.jpeg`, alt: `Example photo 7` },
    { id: 8, src: `/examples/photo-8.JPG`, alt: `Example photo 8` },
  ]

  return (
    <section className="section-clean py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
            What You <span className="bg-gradient-to-r from-accent-coral to-accent-teal bg-clip-text text-transparent">Actually</span> Get
          </h2>
          <p className="text-xl text-secondary max-w-3xl mx-auto">
            Your final animated video compiled from your photos
          </p>
        </div>

        {/* Section Titles */}
        <div className="grid lg:grid-cols-5 gap-8 mb-8">
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-semibold text-primary text-center">
              Upload your desired pictures
            </h3>
          </div>
          <div className="lg:col-span-1"></div>
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-semibold text-primary text-center">
              Get a magical video compiled with music
            </h3>
          </div>
        </div>

        {/* Main Content - Aligned */}
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Left Side - Photo Grid */}
          <div className="lg:col-span-2">
            {/* 8 Photo Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {examplePhotos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden border-2 border-light-border bg-soft-gray hover:border-accent-coral transition-colors">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder on error
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'flex';
                      }
                    }}
                  />
                  <div className="w-full h-full flex items-center justify-center text-subtle-gray hidden">
                    <div className="text-center">
                      <div className="text-2xl mb-1">📸</div>
                      <div className="text-xs">{photo.id}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-secondary text-center">
              Simply upload your favorite photos and our AI will bring them to life
            </p>
          </div>

          {/* Arrow */}
          <div className="lg:col-span-1 flex justify-center items-center min-h-[300px]">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-accent-coral to-accent-teal rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-accent-coral to-accent-teal rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✨</span>
              </div>
            </div>
          </div>

          {/* Right Side - Final Video */}
          <div className="lg:col-span-2">
            {/* Video Player */}
            <div className="relative">
              <div className="bg-deep-charcoal rounded-2xl overflow-hidden shadow-2xl border border-light-border">
                <div className="aspect-video relative">
                  {/* Placeholder video */}
                  <video
                    className="w-full h-full object-cover"
                    poster="/examples/final-video-poster.jpg"
                    controls
                    preload="metadata"
                  >
                    <source src="/examples/final-compiled-video.mp4" type="video/mp4" />
                    {/* Fallback */}
                    <div className="w-full h-full bg-deep-charcoal flex items-center justify-center text-white">
                      <div className="text-center">
                        <div className="text-4xl mb-4">🎬</div>
                        <p>Final Video Preview</p>
                      </div>
                    </div>
                  </video>
                  
                  {/* Enlarge button */}
                  <button
                    onClick={() => setIsVideoModalOpen(true)}
                    className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    title="Enlarge video"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Perfect For Section - Centered */}
        <div className="mt-16 text-center">
          <h4 className="text-2xl font-bold text-primary mb-8">
            Perfect for:
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center gap-3 text-secondary">
              <span className="text-accent-coral text-3xl">🎁</span>
              <span className="text-base font-medium">Send as a gift</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-secondary">
              <svg className="w-8 h-8 text-accent-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span className="text-base font-medium">Share on social media</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-secondary">
              <span className="text-accent-coral text-3xl">🖼️</span>
              <span className="text-base font-medium">Upload to digital frame</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-secondary">
              <span className="text-accent-coral text-3xl">💝</span>
              <span className="text-base font-medium">Keep memories alive</span>
            </div>
          </div>
        </div>

        {/* Video Modal */}
        {isVideoModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="relative max-w-6xl w-full">
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="absolute -top-12 right-0 text-white hover:text-accent-coral text-2xl"
              >
                ✕
              </button>
              <video
                className="w-full rounded-lg"
                controls
                autoPlay
              >
                <source src="/examples/final-compiled-video.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        )}
      </div>
    </section>
  )
} 