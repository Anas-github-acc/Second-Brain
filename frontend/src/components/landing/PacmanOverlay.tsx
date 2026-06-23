'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function PacmanOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<any>(null);

  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Helper to parse time strings like "1m30s" or "90" into seconds
  const parseTimeParam = (t: string): number => {
    if (/^\d+$/.test(t)) {
      return parseInt(t, 10);
    }
    let totalSeconds = 0;
    const minMatch = t.match(/(\d+)m/);
    const secMatch = t.match(/(\d+)s/);
    if (minMatch) {
      totalSeconds += parseInt(minMatch[1], 10) * 60;
    }
    if (secMatch) {
      totalSeconds += parseInt(secMatch[1], 10);
    }
    return totalSeconds || 0;
  };

  // Parse URL search params for ?preview on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      
      const tParam = params.get('t');
      if (tParam) {
        setStartTime(parseTimeParam(tParam));
      }

      const fParam = params.get('f');
      if (fParam) {
        setEndTime(parseTimeParam(fParam));
      }

      if (params.has('preview')) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 4000); // 4 seconds delay instead of 5
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Handle closing sequence
  const handleClose = useCallback(() => {
    if (!isOpen) return;
    setIsOpen(false);
    setIsClosing(true);
    
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    
    closeTimerRef.current = setTimeout(() => {
      setIsClosing(false);
    }, 950); // Matches the CSS transition duration
  }, [isOpen]);

  // Clean up close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  // Auto-close overlay when video reaches specified end time 'f' (Timer Fallback)
  useEffect(() => {
    if (isOpen && endTime > 0) {
      const durationSeconds = Math.max(0, endTime - startTime);
      const timer = setTimeout(() => {
        handleClose();
      }, durationSeconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, endTime, startTime, handleClose]);

  // Initialize and listen to official YouTube IFrame Player API
  useEffect(() => {
    if (isOpen) {
      // 1. Load the YouTube API script if not already present
      const win = window as any;
      if (!win.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }

      // 2. Initializer function for YT Player
      const initPlayer = () => {
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch (e) {}
        }

        playerRef.current = new win.YT.Player('youtube-player-container', {
          videoId: 'WlAPWKXW3Xw',
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            rel: 0,
            start: startTime > 0 ? startTime : undefined,
            end: endTime > 0 ? endTime : undefined,
          },
          events: {
            onStateChange: (event: any) => {
              // event.data === 0 represents the ENDED state
              if (event.data === 0) {
                handleClose();
              }
            },
          },
        });
      };

      // If API is already ready, run initializer immediately. Otherwise register callback
      if (win.YT && win.YT.Player) {
        initPlayer();
      } else {
        const prevCallback = win.onYouTubeIframeAPIReady;
        win.onYouTubeIframeAPIReady = () => {
          if (prevCallback) prevCallback();
          initPlayer();
        };
      }
    } else {
      // If closed, destroy the player to release resources and stop sound/video immediately
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [isOpen, startTime, endTime, handleClose]);

  // Listen for Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Handle clicking outside the overlay
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    if (isOpen) {
      const t = setTimeout(() => {
        window.addEventListener('click', handleClickOutside);
      }, 50);
      return () => {
        clearTimeout(t);
        window.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen, handleClose]);

  // Determine active transition/layout class
  const stateClass = isOpen ? 'open' : isClosing ? 'closing' : '';

  return (
    <>
      {/* Backdrop (Blurry dark cover) */}
      <div 
        className={`editor-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={handleClose}
      />

      {/* Main morphing container */}
      <div
        ref={containerRef}
        className={`pacman-overlay-container ${stateClass}`}
        onClick={() => {
          if (!isOpen && !isClosing) setIsOpen(true);
        }}
      >
        {/* Open State: Fullscreen YouTube Player with Transparent Background */}
        <div 
          className="editor-content-wrapper" 
          style={{ 
            background: 'transparent', 
            height: '100%', 
            width: '100%', 
            position: 'relative' 
          }}
        >
          {/* Floating Close button on top right of the video */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'normal',
              transition: 'background 0.2s, transform 0.2s',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.85)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ✕
          </button>
          
          {/* YouTube iframe container with 16:9 constraints */}
          <div 
            style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '22px', 
              overflow: 'hidden', 
              background: '#000000', 
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65)'
            }}
          >
            {(isOpen || isClosing) && (
              <div
                id="youtube-player-container"
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
