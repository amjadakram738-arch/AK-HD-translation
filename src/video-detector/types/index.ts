/**
 * Type definitions for Universal Smart Video Detector & Downloader
 * Production-ready TypeScript interfaces with strict typing
 */

// ============================================================================
// Core Types - Video Sources and Quality
// ============================================================================

/**
 * Represents a detected video source with metadata
 */
export interface VideoSource {
  /** Unique identifier for the video source */
  id: string;
  
  /** The actual video URL or blob URL */
  url: string;
  
  /** Platform the video originates from */
  platform: Platform;
  
  /** Quality indicators (native resolution, bitrate) */
  quality: QualityProfile[];
  
  /** Video codec information */
  codec?: VideoCodec;
  
  /** Audio codec information */
  audioCodec?: AudioCodec;
  
  /** Whether this is the primary video source */
  isPrimary: boolean;
  
  /** Additional metadata */
  metadata: VideoMetadata;
  
  /** Type of stream */
  type: StreamType;
  
  /** Priority score for ranking */
  priority: number;
  
  /** Whether source is DRM protected */
  isDrmProtected: boolean;
  
  /** Timestamp when detected */
  detectedAt: number;
}

/**
 * Quality profile for a video source
 */
export interface QualityProfile {
  /** Quality level (native = original source) */
  quality: QualityLevel;
  
  /** Video bitrate in kbps */
  bitrate?: number;
  
  /** Resolution width */
  width?: number;
  
  /** Resolution height */
  height?: number;
  
  /** Frame rate in FPS */
  frameRate?: number;
  
  /** Whether this is a natively available quality */
  isNative: boolean;
  
  /** Generated URL for this quality if available */
  url?: string;
  
  /** File size if known */
  fileSize?: number;
  
  /** Whether this quality requires transcoding */
  requiresTranscoding: boolean;
}

/**
 * Download task with progress tracking
 */
export interface DownloadTask {
  /** Unique task ID */
  id: string;
  
  /** Associated video source */
  videoSource: VideoSource;
  
  /** Selected quality level */
  selectedQuality: QualityLevel;
  
  /** Current download status */
  status: DownloadStatus;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Bytes downloaded */
  receivedBytes: number;
  
  /** Total bytes to download */
  totalBytes: number;
  
  /** Download start time */
  startTime?: number;
  
  /** Download end time */
  endTime?: number;
  
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  
  /** Download speed in bytes per second */
  speed?: number;
  
  /** Output filename */
  filename: string;
  
  /** Chrome download item ID */
  downloadId?: number;
  
  /** Error information if failed */
  error?: ErrorInfo;
  
  /** Whether download can be resumed */
  canResume: boolean;
}

// ============================================================================
// Manifest Data Types
// ============================================================================

/**
 * HLS/DASH manifest data structure
 */
export interface ManifestData {
  /** Type of manifest */
  type: 'hls' | 'dash';
  
  /** Master playlist URL */
  masterUrl: string;
  
  /** Available variants */
  variants: Variant[];
  
  /** Audio tracks if available */
  audioTracks?: AudioTrack[];
  
  /** Subtitle tracks if available */
  subtitleTracks?: SubtitleTrack[];
  
  /** DRM information if protected */
  drmInfo?: DRMInfo;
  
  /** Raw manifest content */
  rawManifest: string;
  
  /** Parsed timestamp */
  parsedAt: number;
}

/**
 * Video variant in manifest
 */
export interface Variant {
  /** Bandwidth requirement */
  bandwidth: number;
  
  /** Resolution */
  resolution?: { width: number; height: number };
  
  /** Frame rate */
  frameRate?: number;
  
  /** Codec information */
  codecs?: string;
  
  /** Media playlist URL */
  url: string;
  
  /** Quality level derived from bandwidth */
  quality: QualityLevel;
}

/**
 * Audio track information
 */
export interface AudioTrack {
  /** Language code */
  language: string;
  
  /** Track name */
  name: string;
  
  /** Audio codec */
  codec: string;
  
  /** Track URL */
  url: string;
  
  /** Autoselect flag */
  autoselect: boolean;
  
  /** Default track */
  isDefault: boolean;
}

/**
 * Subtitle track information
 */
export interface SubtitleTrack {
  /** Language code */
  language?: string;
  
  /** Track name */
  name: string;
  
  /** Track URL */
  url: string;
  
  /** MIME type */
  mimeType: string;
  
  /** Autoselect flag */
  autoselect: boolean;
}

/**
 * DRM protection information
 */
export interface DRMInfo {
  /** DRM type */
  type: 'widevine' | 'playready' | 'fairplay' | 'clearkey';
  
  /** License acquisition URL */
  licenseUrl?: string;
  
  /** Certificate URL */
  certificateUrl?: string;
  
  /** Key system ID */
  keySystem?: string;
}

// ============================================================================
// Enums
// ============================================================================

/**
 * Quality levels available
 */
export enum QualityLevel {
  LOW = 'low',           // ~240p-360p
  MEDIUM = 'medium',     // ~480p-576p
  HIGH = 'high',         // ~720p-1080p
  HD = 'hd',            // ~1080p-1440p
  FULL_HD = 'full_hd',  // 1080p
  QHD = 'qhd',          // 1440p
  UHD = 'uhd',          // 4K
  NATIVE = 'native'     // Original source quality
}

/**
 * Video codecs
 */
export enum VideoCodec {
  H264 = 'h264',
  H265 = 'h265',
  VP8 = 'vp8',
  VP9 = 'vp9',
  AV1 = 'av1',
  MPEG4 = 'mpeg4',
  UNKNOWN = 'unknown'
}

/**
 * Audio codecs
 */
export enum AudioCodec {
  AAC = 'aac',
  MP3 = 'mp3',
  VORBIS = 'vorbis',
  OPUS = 'opus',
  FLAC = 'flac',
  AC3 = 'ac3',
  EAC3 = 'eac3',
  UNKNOWN = 'unknown'
}

/**
 * Supported formats
 */
export enum VideoFormat {
  MP4 = 'mp4',
  WEBM = 'webm',
  MKV = 'mkv',
  FLV = 'flv',
  M3U8 = 'm3u8',  // HLS
  MPD = 'mpd',    // DASH
  MOV = 'mov',
  AVI = 'avi',
  UNKNOWN = 'unknown'
}

/**
 * Stream types
 */
export enum StreamType {
  DIRECT = 'direct',      // Direct video file
  HLS = 'hls',           // HTTP Live Streaming
  DASH = 'dash',         // Dynamic Adaptive Streaming
  BLOB = 'blob',         // Blob URL
  MEDIA_SOURCE = 'media-source'  // MediaSource extension
}

/**
 * Download status
 */
export enum DownloadStatus {
  QUEUED = 'queued',
  STARTING = 'starting',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Supported platforms
 */
export enum Platform {
  YOUTUBE = 'youtube',
  VIMEO = 'vimeo',
  NETFLIX = 'netflix',
  AMAZON_PRIME = 'amazon_prime',
  TWITCH = 'twitch',
  DAILYMOTION = 'dailymotion',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  REDDIT = 'reddit',
  IMGUR = 'imgur',
  V_REDDIT = 'vreddit',
  STREAMABLE = 'streamable',
  VIDEO = 'video',  // Generic .video platform
  UNKNOWN = 'unknown'
}

/**
 * Message types for extension communication
 */
export enum MessageType {
  // Content -> Background
  VIDEO_DETECTED = 'video_detected',
  REQUEST_VIDEO_SOURCES = 'request_video_sources',
  DETECT_VIDEOS = 'detect_videos',
  
  // Background -> Content
  VIDEO_SOURCES_RESPONSE = 'video_sources_response',
  DETECTION_RESULT = 'detection_result',
  
  // Download related
  START_DOWNLOAD = 'start_download',
  PAUSE_DOWNLOAD = 'pause_download',
  RESUME_DOWNLOAD = 'resume_download',
  CANCEL_DOWNLOAD = 'cancel_download',
  DOWNLOAD_PROGRESS = 'download_progress',
  DOWNLOAD_COMPLETE = 'download_complete',
  DOWNLOAD_FAILED = 'download_failed',
  
  // UI related
  SHOW_UI = 'show_ui',
  HIDE_UI = 'hide_ui',
  POPUP_MOUNTED = 'popup_mounted',
  POPUP_UNMOUNTED = 'popup_unmounted'
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Video metadata
 */
export interface VideoMetadata {
  /** Page title */
  title?: string;
  
  /** Video duration in seconds */
  duration?: number;
  
  /** Thumbnail URL */
  thumbnailUrl?: string;
  
  /** View count if available */
  viewCount?: number;
  
  /** Upload date */
  uploadDate?: string;
  
  /** Author/uploader */
  author?: string;
  
  /** Description */
  description?: string;
  
  /** Page URL */
  pageUrl: string;
  
  /** Detected platform */
  platform: Platform;
}

/**
 * Error information
 */
export interface ErrorInfo {
  /** Error message */
  message: string;
  
  /** Error type */
  type: ErrorType;
  
  /** Stack trace */
  stack?: string;
  
  /** Whether error is recoverable */
  recoverable: boolean;
}

/**
 * Error types
 */
export enum ErrorType {
  NETWORK = 'network',
  DRM = 'drm',
  PARSE = 'parse',
  DOWNLOAD = 'download',
  STORAGE = 'storage',
  UNKNOWN = 'unknown'
}

/**
 * Detection options
 */
export interface DetectionOptions {
  /** Include quality profiles */
  includeQuality?: boolean;
  
  /** Include manifest data */
  includeManifest?: boolean;
  
  /** Include DRM info */
  includeDrmInfo?: boolean;
  
  /** Deep scan for hidden sources */
  deepScan?: boolean;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Max number of sources to return */
  maxSources?: number;
}

/**
 * Message interface for extension communication
 */
export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
}

/**
 * Global window interface for API exposure
 */
declare global {
  interface Window {
    VideoDetectorAPI?: {
      getVideoSources: () => Promise<VideoSource[]>;
      startDownload: (videoId: string, quality: QualityLevel) => Promise<string>;
      pauseDownload: (downloadId: string) => Promise<void>;
      resumeDownload: (downloadId: string) => Promise<void>;
      cancelDownload: (downloadId: string) => Promise<void>;
      getDownloadProgress: (downloadId: string) => Promise<DownloadTask | null>;
      onVideoDetected: (callback: (sources: VideoSource[]) => void) => void;
      onDownloadProgress: (callback: (task: DownloadTask) => void) => void;
    };
  }
}

// ============================================================================
// Utils and Validation
// ============================================================================

/**
 * Validates if a URL is a valid video URL
 */
export function isValidVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol;
    
    return protocol === 'http:' || protocol === 'https:' || protocol === 'blob:';
  } catch {
    return false;
  }
}

/**
 * Gets file extension from URL
 */
export function getFileExtension(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  } catch {
    return '';
  }
}

/**
 * Maps file extension to format enum
 */
export function mapExtensionToFormat(ext: string): VideoFormat {
  const formatMap: Record<string, VideoFormat> = {
    'mp4': VideoFormat.MP4,
    'webm': VideoFormat.WEBM,
    'mkv': VideoFormat.MKV,
    'm3u8': VideoFormat.M3U8,
    'mpd': VideoFormat.MPD,
    'flv': VideoFormat.FLV,
    'mov': VideoFormat.MOV,
    'avi': VideoFormat.AVI
  };
  
  return formatMap[ext] || VideoFormat.UNKNOWN;
}

/**
 * Gets quality level from resolution
 */
export function getQualityFromResolution(width: number, height: number): QualityLevel {
  const resolution = width * height;
  
  if (resolution >= 3840 * 2160) return QualityLevel.UHD;
  if (resolution >= 2560 * 1440) return QualityLevel.QHD;
  if (resolution >= 1920 * 1080) return QualityLevel.FULL_HD;
  if (resolution >= 1280 * 720) return QualityLevel.HD;
  if (resolution >= 854 * 480) return QualityLevel.HIGH;
  if (resolution >= 640 * 360) return QualityLevel.MEDIUM;
  
  return QualityLevel.LOW;
}
