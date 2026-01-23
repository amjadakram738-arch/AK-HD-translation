/**
 * Main VideoDetector class - Orchestrates video detection across platforms
 */

import { 
  VideoSource, 
  DetectionOptions, 
  Platform,
  ExtensionMessage,
  MessageType 
} from '../types';
import { StreamParser, GenericStreamParser, YouTubeStreamParser } from './StreamParser';
import { QualityEngine } from './QualityEngine';
import { createLogger } from '../utils/logger';
import { storage } from '../utils/storage';

const logger = createLogger('VideoDetector');

/**
 * Detection result
 */
export interface DetectionResult {
  sources: VideoSource[];
  timestamp: number;
  duration: number;
  platform: Platform;
}

/**
 * Main VideoDetector class
 */
export class VideoDetector {
  private parsers: Map<Platform, StreamParser> = new Map();
  private qualityEngine: QualityEngine;
  private isInitialized = false;
  private detectedSources: VideoSource[] = [];
  private detectionCallbacks: Array<(sources: VideoSource[]) => void> = [];

  constructor() {
    this.qualityEngine = new QualityEngine();
    this.initializeParsers();
  }

  /**
   * Initialize platform-specific parsers
   */
  private initializeParsers(): void {
    logger.info('Initializing parsers');
    
    // Register parsers in priority order
    this.parsers.set(Platform.YOUTUBE, new YouTubeStreamParser());
    // Add more parsers here: Vimeo, Netflix, etc.
    
    this.isInitialized = true;
    logger.info(`Registered ${this.parsers.size} platform parsers`);
  }

  /**
   * Get the appropriate parser for current page
   */
  private getParserForPage(): StreamParser | null {
    // Check platform-specific parsers first
    for (const parser of this.parsers.values()) {
      if (parser.canHandlePage()) {
        logger.debug(`Found platform parser: ${parser.platform}`);
        return parser;
      }
    }

    // Fallback to generic parser
    logger.debug('Using generic parser');
    return new GenericStreamParser();
  }

  /**
   * Detect video sources on current page
   */
  public async detectVideos(options: DetectionOptions = {}): Promise<DetectionResult> {
    const startTime = performance.now();
    logger.info('Starting video detection', { options });

    try {
      const parser = this.getParserForPage();
      if (!parser) {
        throw new Error('No suitable parser found');
      }

      // Detect sources
      const rawSources = await parser.detectSources(options);
      logger.info(`Detected ${rawSources.length} raw sources`);

      // Generate quality profiles if requested
      if (options.includeQuality !== false) {
        for (const source of rawSources) {
          if (source.quality.length === 0) {
            source.quality = await parser.generateQualityProfiles(source);
          }
        }
      }

      // Extract metadata
      const metadata = await parser.extractMetadata();
      
      // Update sources with metadata
      for (const source of rawSources) {
        source.metadata = { ...metadata, ...source.metadata };
      }

      // Sort by priority and filter duplicates
      const processedSources = this.processDetectedSources(rawSources);
      
      // Store detection result
      this.detectedSources = processedSources;
      
      // Notify callbacks
      this.notifyDetectionCallbacks(processedSources);

      const endTime = performance.now();
      const duration = endTime - startTime;

      logger.info(`Detection completed in ${duration}ms`, {
        sourcesFound: processedSources.length
      });

      return {
        sources: processedSources,
        timestamp: Date.now(),
        duration,
        platform: metadata.platform
      };

    } catch (error) {
      logger.error('Video detection failed', error);
      throw error;
    }
  }

  /**
   * Get previously detected sources
   */
  public getDetectedSources(): VideoSource[] {
    return [...this.detectedSources];
  }

  /**
   * Process and clean detected sources
   */
  private processDetectedSources(sources: VideoSource[]): VideoSource[] {
    // Remove duplicates (same URL)
    const uniqueSources = new Map<string, VideoSource>();
    
    for (const source of sources) {
      if (!uniqueSources.has(source.url)) {
        uniqueSources.set(source.url, source);
      } else {
        // Keep the one with higher priority
        const existing = uniqueSources.get(source.url)!;
        if (source.priority > existing.priority) {
          uniqueSources.set(source.url, source);
        }
      }
    }

    // Convert back to array and sort by priority
    const processed = Array.from(uniqueSources.values())
      .sort((a, b) => b.priority - a.priority);

    logger.debug(`Processed ${sources.length} sources to ${processed.length} unique sources`);
    return processed;
  }

  /**
   * Save detection result to storage
   */
  public async saveDetectionResult(result: DetectionResult): Promise<boolean> {
    try {
      const key = `detection:${window.location.href}`;
      await storage.set(key, result, 30 * 60 * 1000); // 30 minute TTL
      logger.debug('Detection result saved to storage');
      return true;
    } catch (error) {
      logger.error('Failed to save detection result', error);
      return false;
    }
  }

  /**
   * Load previous detection result from storage
   */
  public async loadDetectionResult(): Promise<DetectionResult | null> {
    try {
      const key = `detection:${window.location.href}`;
      const result = await storage.get<DetectionResult>(key);
      
      if (result) {
        logger.debug('Detection result loaded from storage');
        this.detectedSources = result.sources;
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to load detection result', error);
      return null;
    }
  }

  /**
   * Add detection callback
   */
  public onDetection(callback: (sources: VideoSource[]) => void): void {
    this.detectionCallbacks.push(callback);
    logger.debug('Detection callback registered');
  }

  /**
   * Remove detection callback
   */
  public offDetection(callback: (sources: VideoSource[]) => void): void {
    const index = this.detectionCallbacks.indexOf(callback);
    if (index !== -1) {
      this.detectionCallbacks.splice(index, 1);
      logger.debug('Detection callback removed');
    }
  }

  /**
   * Notify detection callbacks
   */
  private notifyDetectionCallbacks(sources: VideoSource[]): void {
    logger.debug(`Notifying ${this.detectionCallbacks.length} callbacks`);
    for (const callback of this.detectionCallbacks) {
      try {
        callback(sources);
      } catch (error) {
        logger.error('Error in detection callback', error);
      }
    }
  }

  /**
   * Handle message from other parts of extension
   */
  public async handleMessage(message: ExtensionMessage): Promise<unknown> {
    logger.debug('Handling message', { type: message.type });

    try {
      switch (message.type) {
        case MessageType.DETECT_VIDEOS:
          const options = (message.payload || {}) as DetectionOptions;
          const result = await this.detectVideos(options);
          await this.saveDetectionResult(result);
          return result;

        case MessageType.REQUEST_VIDEO_SOURCES:
          return this.getDetectedSources();

        default:
          logger.warn('Unknown message type', { type: message.type });
          return null;
      }
    } catch (error) {
      logger.error('Message handling failed', { type: message.type, error });
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    logger.info('Cleaning up VideoDetector');
    
    // Cleanup parsers
    for (const parser of this.parsers.values()) {
      try {
        parser.cleanup();
      } catch (error) {
        logger.error('Parser cleanup failed', { platform: parser.platform, error });
      }
    }
    
    this.parsers.clear();
    this.detectionCallbacks.clear();
    this.detectedSources = [];
    
    logger.info('VideoDetector cleanup completed');
  }

  /**
   * Get detector stats
   */
  public getStats() {
    return {
      parsers: this.parsers.size,
      detectedSources: this.detectedSources.length,
      callbacks: this.detectionCallbacks.length,
      isInitialized: this.isInitialized
    };
  }
}

let instance: VideoDetector | null = null;

/**
 * Get singleton instance
 */
export function getVideoDetector(): VideoDetector {
  if (!instance) {
    instance = new VideoDetector();
  }
  return instance;
}

/**
 * Cleanup singleton instance
 */
export function cleanupVideoDetector(): void {
  if (instance) {
    instance.cleanup();
    instance = null;
  }
}
