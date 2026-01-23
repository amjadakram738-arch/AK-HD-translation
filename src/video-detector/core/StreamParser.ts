/**
 * Abstract interface for platform-specific video stream parsers
 * Each platform (YouTube, Vimeo, etc.) implements this interface
 */

import { 
  VideoSource, 
  QualityProfile, 
  Platform, 
  QualityLevel, 
  VideoFormat, 
  VideoMetadata,
  StreamType,
  DetectionOptions 
} from '../types';
import { createLogger, tryCatchAsync } from '../utils/logger';

const logger = createLogger('StreamParser');

/**
 * Abstract base class for stream parsers
 */
export abstract class StreamParser {
  /** The platform this parser handles */
  public abstract readonly platform: Platform;
  
  /** Logger instance for this parser */
  protected logger = createLogger(`StreamParser:${this.platform}`);

  /**
   * Check if this parser can handle the current page
   */
  public abstract canHandlePage(): boolean;

  /**
   * Detect video sources on the page
   */
  public abstract detectSources(options?: DetectionOptions): Promise<VideoSource[]>;

  /**
   * Generate quality profiles for a video source
   */
  public abstract generateQualityProfiles(source: VideoSource): Promise<QualityProfile[]>;

  /**
   * Extract video metadata from the page
   */
  public abstract extractMetadata(): Promise<VideoMetadata>;

  /**
   * Clean up resources
   */
  public abstract cleanup(): void;
}

/**
 * Generic stream parser for direct video URLs
 */
export class GenericStreamParser extends StreamParser {
  public readonly platform = Platform.UNKNOWN;

  public canHandlePage(): boolean {
    return true; // Generic parser can always attempt to handle
  }

  public async detectSources(options?: DetectionOptions): Promise<VideoSource[]> {
    return tryCatchAsync(
      async () => {
        const sources: VideoSource[] = [];
        
        // Look for video elements
        const videoElements = document.querySelectorAll('video');
        for (const video of videoElements) {
          const videoSources = this.extractSourcesFromVideoElement(video);
          sources.push(...videoSources);
        }

        // Look for source tags
        const sourceTags = document.querySelectorAll('source[type*="video"]');
        for (const source of sourceTags) {
          const videoSource = this.parseSourceTag(source);
          if (videoSource) {
            sources.push(videoSource);
          }
        }

        // Look for video URLs in page
        const pageSources = this.extractVideoUrlsFromPage();
        sources.push(...pageSources);

        this.logger.info(`Detected ${sources.length} generic sources`);
        return sources;
      },
      'detectSources'
    ) || [];
  }

  public async generateQualityProfiles(source: VideoSource): Promise<QualityProfile[]> {
    return tryCatchAsync(
      async () => {
        // For generic sources, create a single profile with native quality
        return [{
          quality: QualityLevel.NATIVE,
          isNative: true,
          url: source.url,
          requiresTranscoding: false,
          bitrate: source.metadata?.duration ? undefined : undefined
        }];
      },
      'generateQualityProfiles'
    ) || [];
  }

  public async extractMetadata(): Promise<VideoMetadata> {
    return tryCatchAsync(
      async () => {
        const url = window.location.href;
        const title = document.title || 'Unknown Video';
        
        return {
          title,
          pageUrl: url,
          platform: Platform.UNKNOWN
        };
      },
      'extractMetadata'
    ) || {
      title: document.title || 'Unknown Video',
      pageUrl: window.location.href,
      platform: Platform.UNKNOWN
    };
  }

  public cleanup(): void {
    // Nothing to clean up for generic parser
  }

  /**
   * Extract sources from video element
   */
  private extractSourcesFromVideoElement(video: HTMLVideoElement): VideoSource[] {
    const sources: VideoSource[] = [];
    const timestamp = Date.now();

    // Check currentSrc
    if (video.currentSrc && video.currentSrc !== window.location.href) {
      const source: VideoSource = {
        id: `generic-video-${timestamp}-${sources.length}`,
        url: video.currentSrc,
        platform: Platform.UNKNOWN,
        quality: [],
        isPrimary: sources.length === 0,
        metadata: {
          title: document.title || 'Unknown Video',
          pageUrl: window.location.href,
          platform: Platform.UNKNOWN,
          duration: video.duration || undefined
        },
        type: this.detectStreamType(video.currentSrc),
        priority: 10,
        isDrmProtected: false,
        detectedAt: timestamp
      };
      sources.push(source);
    }

    // Check src attribute
    if (video.src && video.src !== window.location.href) {
      const source: VideoSource = {
        id: `generic-video-${timestamp}-${sources.length}`,
        url: video.src,
        platform: Platform.UNKNOWN,
        quality: [],
        isPrimary: sources.length === 0,
        metadata: {
          title: document.title || 'Unknown Video',
          pageUrl: window.location.href,
          platform: Platform.UNKNOWN,
          duration: video.duration || undefined
        },
        type: this.detectStreamType(video.src),
        priority: 10,
        isDrmProtected: false,
        detectedAt: timestamp
      };
      sources.push(source);
    }

    return sources;
  }

  /**
   * Parse source tag
   */
  private parseSourceTag(source: Element): VideoSource | null {
    const src = source.getAttribute('src');
    const type = source.getAttribute('type');
    
    if (!src) return null;

    const url = new URL(src, window.location.href).href;
    
    return {
      id: `generic-source-${Date.now()}`,
      url,
      platform: Platform.UNKNOWN,
      quality: [],
      isPrimary: false,
      metadata: {
        title: document.title || 'Unknown Video',
        pageUrl: window.location.href,
        platform: Platform.UNKNOWN
      },
      type: this.detectStreamType(url),
      priority: 5,
      isDrmProtected: false,
      detectedAt: Date.now()
    };
  }

  /**
   * Extract video URLs from page content
   */
  private extractVideoUrlsFromPage(): VideoSource[] {
    const sources: VideoSource[] = [];
    const timestamp = Date.now();

    // Common video file extensions
    const videoExtensions = ['.mp4', '.webm', '.mkv', '.flv', '.mov', '.avi', '.m3u8', '.mpd'];
    const videoPatterns = videoExtensions.map(ext => `\\${ext}`).join('|');
    
    // Look in scripts
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      if (!script.textContent) continue;
      
      const regex = new RegExp(`["'](https?://[^"'\s]+?(?:${videoPatterns}))["']`, 'gi');
      let match;
      
      while ((match = regex.exec(script.textContent)) !== null) {
        const url = match[1];
        if (sources.some(s => s.url === url)) continue;
        
        sources.push({
          id: `generic-page-${timestamp}-${sources.length}`,
          url,
          platform: Platform.UNKNOWN,
          quality: [],
          isPrimary: false,
          metadata: {
            title: document.title || 'Unknown Video',
            pageUrl: window.location.href,
            platform: Platform.UNKNOWN
          },
          type: this.detectStreamType(url),
          priority: 3,
          isDrmProtected: false,
          detectedAt: timestamp
        });
      }
    }

    // Look in attributes
    const elementsWithSrc = document.querySelectorAll('[src]');
    for (const element of elementsWithSrc) {
      const src = element.getAttribute('src');
      if (!src) continue;
      
      const hasVideoExt = videoExtensions.some(ext => src.toLowerCase().includes(ext));
      if (!hasVideoExt) continue;
      
      if (sources.some(s => s.url === src)) continue;
      
      const url = new URL(src, window.location.href).href;
      sources.push({
        id: `generic-attr-${timestamp}-${sources.length}`,
        url,
        platform: Platform.UNKNOWN,
        quality: [],
        isPrimary: false,
        metadata: {
          title: document.title || 'Unknown Video',
          pageUrl: window.location.href,
          platform: Platform.UNKNOWN
        },
        type: this.detectStreamType(url),
        priority: 2,
        isDrmProtected: false,
        detectedAt: timestamp
      });
    }

    return sources;
  }

  /**
   * Detect stream type from URL
   */
  private detectStreamType(url: string): StreamType {
    const urlLower = url.toLowerCase();
    
    if (urlLower.endsWith('.m3u8')) return StreamType.HLS;
    if (urlLower.endsWith('.mpd')) return StreamType.DASH;
    if (url.startsWith('blob:')) return StreamType.BLOB;
    
    return StreamType.DIRECT;
  }
}

/**
 * YouTube-specific stream parser
 */
export class YouTubeStreamParser extends StreamParser {
  public readonly platform = Platform.YOUTUBE;

  public canHandlePage(): boolean {
    return window.location.hostname.includes('youtube.com') ||
           window.location.hostname.includes('youtu.be');
  }

  public async detectSources(options?: DetectionOptions): Promise<VideoSource[]> {
    return tryCatchAsync(
      async () => {
        const sources: VideoSource[] = [];
        const timestamp = Date.now();

        // Look for YT player configuration
        const ytPlayer = (window as any).ytplayer;
        if (ytPlayer?.config?.args?.raw_player_response) {
          const playerResponse = JSON.parse(ytPlayer.config.args.raw_player_response);
          sources.push(...this.extractFromPlayerResponse(playerResponse, timestamp));
        }

        // Look for ytInitialPlayerResponse
        const initialResponse = (window as any).ytInitialPlayerResponse;
        if (initialResponse) {
          sources.push(...this.extractFromPlayerResponse(initialResponse, timestamp));
        }

        // Look for video elements (fallback)
        const videoElements = document.querySelectorAll('video');
        if (videoElements.length > 0) {
          const genericParser = new GenericStreamParser();
          const genericSources = await genericParser.detectSources(options);
          sources.push(...genericSources);
        }

        this.logger.info(`Detected ${sources.length} YouTube sources`);
        return sources;
      },
      'detectSources'
    ) || [];
  }

  public async generateQualityProfiles(source: VideoSource): Promise<QualityProfile[]> {
    return tryCatchAsync(
      async () => {
        if (!source.metadata?.platform || source.metadata.platform !== Platform.YOUTUBE) {
          return [];
        }

        // YouTube sources often have quality information embedded
        return source.quality; // Assume quality is already populated from extraction
      },
      'generateQualityProfiles'
    ) || [];
  }

  public async extractMetadata(): Promise<VideoMetadata> {
    return tryCatchAsync(
      async () => {
        const metadata: VideoMetadata = {
          title: document.title?.replace(' - YouTube', '') || 'YouTube Video',
          pageUrl: window.location.href,
          platform: Platform.YOUTUBE
        };

        // Try to extract video ID
        const videoId = this.extractVideoId(window.location.href);
        if (videoId) {
          metadata.title = metadata.title || `YouTube Video ${videoId}`;
        }

        // Look for duration in page
        const durationElement = document.querySelector('.ytp-time-duration');
        if (durationElement?.textContent) {
          metadata.duration = this.parseDuration(durationElement.textContent);
        }

        return metadata;
      },
      'extractMetadata'
    ) || {
      title: document.title?.replace(' - YouTube', '') || 'YouTube Video',
      pageUrl: window.location.href,
      platform: Platform.YOUTUBE
    };
  }

  public cleanup(): void {
    // Nothing specific to clean up for YouTube
  }

  /**
   * Extract video sources from YouTube player response
   */
  private extractFromPlayerResponse(response: any, timestamp: number): VideoSource[] {
    const sources: VideoSource[] = [];
    
    try {
      // Check for streaming data
      const streamingData = response.streamingData;
      if (!streamingData) return sources;

      // Extract formats
      const formats = [
        ...(streamingData.formats || []),
        ...(streamingData.adaptiveFormats || [])
      ];

      for (const format of formats) {
        if (!format.url) continue;

        const quality = this.mapYouTubeQuality(format.quality || format.qualityLabel);
        
        sources.push({
          id: `youtube-${format.itag || timestamp}-${sources.length}`,
          url: format.url,
          platform: Platform.YOUTUBE,
          quality: [{
            quality,
            isNative: true,
            url: format.url,
            bitrate: format.bitrate ? Math.floor(format.bitrate / 1024) : undefined,
            width: format.width,
            height: format.height,
            frameRate: format.fps,
            requiresTranscoding: false
          }],
          codec: this.detectVideoCodec(format.mimeType),
          audioCodec: this.detectAudioCodec(format.mimeType),
          isPrimary: sources.length === 0,
          metadata: {
            title: document.title?.replace(' - YouTube', '') || 'YouTube Video',
            pageUrl: window.location.href,
            platform: Platform.YOUTUBE
          },
          type: StreamType.DIRECT,
          priority: 100, // High priority for YouTube sources
          isDrmProtected: false,
          detectedAt: timestamp
        });
      }
    } catch (error) {
      this.logger.error('Failed to extract from player response', error);
    }

    return sources;
  }

  /**
   * Map YouTube quality string to QualityLevel enum
   */
  private mapYouTubeQuality(quality: string): QualityLevel {
    const qualityStr = String(quality || '').toLowerCase();
    
    if (qualityStr.includes('2160') || qualityStr.includes('4k')) return QualityLevel.UHD;
    if (qualityStr.includes('1440') || qualityStr.includes('2k')) return QualityLevel.QHD;
    if (qualityStr.includes('1080') || qualityStr.includes('hd')) return QualityLevel.FULL_HD;
    if (qualityStr.includes('720')) return QualityLevel.HD;
    if (qualityStr.includes('480')) return QualityLevel.HIGH;
    if (qualityStr.includes('360')) return QualityLevel.MEDIUM;
    if (qualityStr.includes('240')) return QualityLevel.LOW;
    
    return QualityLevel.NATIVE;
  }

  /**
   * Detect video codec from MIME type
   */
  private detectVideoCodec(mimeType?: string): any {
    if (!mimeType) return undefined;
    
    const mimeStr = mimeType.toLowerCase();
    if (mimeStr.includes('avc1') || mimeStr.includes('h264')) return { h264: 'h264' };
    if (mimeStr.includes('vp9')) return { vp9: 'vp9' };
    if (mimeStr.includes('vp8')) return { vp8: 'vp8' };
    if (mimeStr.includes('hev') || mimeStr.includes('h265')) return { h265: 'h265' };
    
    return undefined;
  }

  /**
   * Detect audio codec from MIME type
   */
  private detectAudioCodec(mimeType?: string): any {
    if (!mimeType) return undefined;
    
    const mimeStr = mimeType.toLowerCase();
    if (mimeStr.includes('mp4a')) return { aac: 'aac' };
    if (mimeStr.includes('vorbis')) return { vorbis: 'vorbis' };
    if (mimeStr.includes('opus')) return { opus: 'opus' };
    
    return undefined;
  }

  /**
   * Extract video ID from URL
   */
  private extractVideoId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.substring(1);
      }
      
      return urlObj.searchParams.get('v');
    } catch {
      return null;
    }
  }

  /**
   * Parse duration string to seconds
   */
  private parseDuration(durationStr: string): number | undefined {
    try {
      const parts = durationStr.split(':').map(p => parseInt(p, 10));
      
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
    } catch {
      // Ignore parsing errors
    }
    
    return undefined;
  }
}
