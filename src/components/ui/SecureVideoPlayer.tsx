import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SecureVideoPlayerProps {
  videoUrl: string;
  title: string;
  duration?: string;
  watermarkText?: string;      // e.g. student name
  operativeId?: string;        // e.g. '#UWE-OP-1234'
  moduleId?: string;
  seriesId?: string;
  isCompleted?: boolean;
  onProgressMilestone?: (percent: number) => void;
  onToggleComplete?: () => void;
  onClose?: () => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  videoUrl,
  title,
  duration,
  watermarkText,
  operativeId,
  moduleId,
  isCompleted = false,
  onProgressMilestone,
  onToggleComplete,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [watermarkPos, setWatermarkPos] = useState({ x: 20, y: 20 });

  // Track which milestones have already been reported so we don't fire duplicates
  const reportedMilestones = useRef<Set<number>>(new Set());
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);

  // ── Determine if URL is YouTube ──
  const isYouTube = videoUrl.includes('youtube') || videoUrl.includes('youtu.be');

  // ── Dynamic watermark position (moves every 8 seconds) ──
  useEffect(() => {
    if (!watermarkText) return;
    const interval = setInterval(() => {
      setWatermarkPos({
        x: 10 + Math.random() * 60,
        y: 10 + Math.random() * 65,
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [watermarkText]);

  // ── Anti-download: disable right-click on video area ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventContext = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const preventKeys = (e: KeyboardEvent) => {
      // Block Ctrl+S (save), Ctrl+Shift+I (devtools), F12
      if (
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        e.key === 'F12'
      ) {
        e.preventDefault();
      }
    };

    container.addEventListener('contextmenu', preventContext);
    document.addEventListener('keydown', preventKeys);

    return () => {
      container.removeEventListener('contextmenu', preventContext);
      document.removeEventListener('keydown', preventKeys);
    };
  }, []);

  // ── Auto-hide controls after 3 seconds of no activity ──
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // ── Video event handlers ──
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    setCurrentTime(time);

    // Buffered progress
    if (videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }

    // Report progress milestones
    if (dur > 0 && onProgressMilestone && moduleId) {
      const percent = Math.round((time / dur) * 100);
      const milestones = [25, 50, 75, 100];
      for (const m of milestones) {
        if (percent >= m && !reportedMilestones.current.has(m)) {
          reportedMilestones.current.add(m);
          onProgressMilestone(m);
        }
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setVolume(val);
    setIsMuted(val === 0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    videoRef.current.currentTime = ratio * videoRef.current.duration;
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes (e.g. Escape key)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;
  const bufferedPercent = videoDuration > 0 ? (buffered / videoDuration) * 100 : 0;

  // ── YouTube embed fallback ──
  if (isYouTube) {
    // Extract YouTube video ID from all common URL formats:
    // - https://www.youtube.com/watch?v=XXXXXXXXXXX
    // - https://www.youtube.com/embed/XXXXXXXXXXX
    // - https://youtu.be/XXXXXXXXXXX
    // - https://www.youtube.com/v/XXXXXXXXXXX
    let ytId = '';
    if (videoUrl.includes('embed/')) {
      ytId = videoUrl.split('embed/')[1]?.split(/[?&]/)[0] || '';
    } else if (videoUrl.includes('youtu.be/')) {
      ytId = videoUrl.split('youtu.be/')[1]?.split(/[?&]/)[0] || '';
    } else if (videoUrl.includes('v=')) {
      ytId = videoUrl.split('v=')[1]?.split(/[?&#]/)[0] || '';
    } else if (videoUrl.includes('/v/')) {
      ytId = videoUrl.split('/v/')[1]?.split(/[?&]/)[0] || '';
    }

    return (
      <div ref={containerRef} className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {/* Watermark overlay on YouTube */}
        {watermarkText && (
          <div
            className="absolute pointer-events-none select-none z-10 transition-all duration-[2000ms] ease-in-out"
            style={{ top: `${watermarkPos.y}%`, left: `${watermarkPos.x}%` }}
          >
            <p className="font-mono-data text-[11px] text-white/20 tracking-wider whitespace-nowrap rotate-[-15deg]">
              {watermarkText} {operativeId && `• ${operativeId}`}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Self-hosted secure video player ──
  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group select-none"
      onMouseMove={resetControlsTimer}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Video Element — no native controls, no download attribute */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
        playsInline
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        autoPlay
      />

      {/* ── Dynamic Watermark Overlay ── */}
      {watermarkText && (
        <div
          className="absolute pointer-events-none select-none z-10 transition-all duration-[2000ms] ease-in-out"
          style={{ top: `${watermarkPos.y}%`, left: `${watermarkPos.x}%` }}
        >
          <p className="font-mono-data text-[11px] text-white/15 tracking-wider whitespace-nowrap rotate-[-18deg]">
            {watermarkText} {operativeId && `• ${operativeId}`}
          </p>
        </div>
      )}

      {/* ── Center Play/Pause Overlay ── */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer"
            onClick={togglePlay}
          >
            <div className="w-20 h-20 rounded-full bg-secondary/90 flex items-center justify-center shadow-[0_0_40px_rgba(255,184,0,0.5)] hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-4xl text-black ml-1">play_arrow</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Custom Controls Bar ── */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 10 }}
        className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pt-8 pb-3 transition-all"
      >
        {/* Progress Bar */}
        <div
          ref={progressBarRef}
          className="w-full h-1.5 bg-white/15 rounded-full cursor-pointer mb-3 group/bar hover:h-2.5 transition-all relative"
          onClick={handleSeek}
        >
          {/* Buffered */}
          <div
            className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
            style={{ width: `${bufferedPercent}%` }}
          />
          {/* Played */}
          <div
            className="absolute inset-y-0 left-0 bg-secondary rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Scrub Head */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-secondary shadow-[0_0_10px_rgba(255,184,0,0.6)] opacity-0 group-hover/bar:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 7px)` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Controls */}
          <div className="flex items-center gap-2.5">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-secondary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1 group/vol">
              <button onClick={toggleMute} className="text-white hover:text-secondary transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-xl">
                  {isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                </span>
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/vol:w-16 transition-all duration-200 accent-secondary cursor-pointer"
              />
            </div>

            {/* Time Display */}
            <span className="font-mono-data text-[11px] text-white/70">
              {formatTime(currentTime)} / {formatTime(videoDuration)}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5">
            {/* Playback Speed */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 font-mono-data text-[11px] text-white/80 cursor-pointer transition-colors"
              >
                {playbackSpeed}x
              </button>
              <AnimatePresence>
                {showSpeedMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute bottom-full right-0 mb-2 bg-[#1a1f2e] border border-outline-variant/40 rounded-lg overflow-hidden shadow-xl z-50"
                  >
                    {PLAYBACK_SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        className={`block w-full px-4 py-1.5 text-left font-mono-data text-xs cursor-pointer transition-colors ${
                          playbackSpeed === s
                            ? 'bg-secondary/20 text-secondary font-bold'
                            : 'text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-secondary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── DRM Shield Badge ── */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-secondary/30">
        <span className="material-symbols-outlined text-secondary text-sm">shield</span>
        <span className="font-mono-data text-[9px] text-secondary font-bold tracking-wider">DRM PROTECTED</span>
      </div>
    </div>
  );
};
