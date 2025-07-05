'use client'

import { useSmartLogin } from '@/hooks/useSmartLogin'
import { useState, useEffect, useRef } from 'react'

export function ExampleGallery() {
  const { handleSmartLogin, isLoading } = useSmartLogin()
  const [isVisible, setIsVisible] = useState(false)
  const [videoVisibility, setVideoVisibility] = useState<Record<number, boolean>>({})
  const sectionRef = useRef<HTMLElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  // Individual video intersection observer for autoplay when visible
  useEffect(() => {
    if (!isVisible) return;

    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoIndex = parseInt(entry.target.getAttribute('data-video-index') || '0');
          const video = entry.target.querySelector('video') as HTMLVideoElement;
          
          if (entry.isIntersecting && video) {
            setVideoVisibility(prev => ({ ...prev, [videoIndex]: true }));
            // Autoplay when video comes into view
            video.play().catch(() => {
              // Silently fail if autoplay is blocked
            });
          } else if (video) {
            setVideoVisibility(prev => ({ ...prev, [videoIndex]: false }));
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      { threshold: 0.3 }
    );

    // Observe all video containers after they're rendered
    const timeoutId = setTimeout(() => {
      const videoContainers = document.querySelectorAll('[data-video-index]');
      videoContainers.forEach(container => {
        videoObserver.observe(container);
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      videoObserver.disconnect();
    };
  }, [isVisible])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="examples" className="section-soft py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
            See the <span className="bg-gradient-to-r from-accent-coral to-accent-teal bg-clip-text text-transparent">Magic</span>
          </h2>
          <p className="text-xl text-secondary max-w-2xl mx-auto">
            Watch ordinary photos transform into extraordinary memories
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { title: 'Family Portrait', desc: 'Beautiful family portraits coming to life', video: '/examples/family-portrait-example.mp4', thumbnail: '/examples/family-portrait-example.jpg' },
            { title: 'Baby\'s First Smile', desc: 'Old memories now experienced in video', video: '/examples/baby-smile-example.mp4', thumbnail: '/examples/baby-smile-example.JPG' },
            { title: 'Wedding Day', desc: 'Old memories now experienced in video', video: '/examples/wedding-day-example.mp4', thumbnail: '/examples/wedding-day-example.jpg' }
          ].map((example, index) => (
            <div key={index} className={`group cursor-pointer transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${index * 200}ms` }}>
              <div className="card-clean overflow-hidden hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                {/* Video preview with thumbnail */}
                <div 
                  className="aspect-square relative overflow-hidden"
                  data-video-index={index}
                  onMouseEnter={(e) => {
                    // Only use hover on desktop
                    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                      const video = e.currentTarget.querySelector('video') as HTMLVideoElement;
                      if (video) {
                        video.play().catch(() => {
                          // Silently fail if autoplay is blocked
                        });
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    // Only use hover on desktop
                    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                      const video = e.currentTarget.querySelector('video') as HTMLVideoElement;
                      if (video) {
                        video.pause();
                        video.currentTime = 0;
                      }
                    }
                  }}
                  onTouchStart={(e) => {
                    // Mobile touch handling
                    const video = e.currentTarget.querySelector('video') as HTMLVideoElement;
                    if (video) {
                      if (video.paused) {
                        video.play().catch(console.error);
                      } else {
                        video.pause();
                      }
                    }
                  }}
                  onClick={(e) => {
                    // Desktop click handling
                    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                      const video = e.currentTarget.querySelector('video') as HTMLVideoElement;
                      if (video) {
                        if (video.paused) {
                          video.play().catch(console.error);
                        } else {
                          video.pause();
                        }
                      }
                    }
                  }}
                >
                  <img
                    src={example.thumbnail}
                    alt={example.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image failed to load:', example.thumbnail);
                      // Try without leading slash
                      const img = e.target as HTMLImageElement;
                      if (img.src.includes('/examples/')) {
                        img.src = example.thumbnail.replace('/examples/', 'examples/');
                      }
                    }}
                  />
                  <video
                    className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 ${
                      videoVisibility[index] ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  >
                    <source src={example.video} type="video/mp4" />
                  </video>
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
                    <div className="bg-white/90 rounded-full p-4 shadow-lg">
                      <svg className="w-8 h-8 text-deep-charcoal" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Title overlay */}
                  <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                    <h3 className="font-semibold text-lg text-white drop-shadow-lg">{example.title}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-secondary">{example.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-secondary mb-6">Ready to bring your memories to life?</p>
          <button 
            onClick={handleSmartLogin}
            disabled={isLoading}
            className="btn-gradient text-lg px-8 py-4"
          >
            {isLoading ? 'Loading...' : 'Try Your Free Clip'}
          </button>
        </div>
      </div>
    </section>
  )
} 