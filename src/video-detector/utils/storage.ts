/**
 * Type-safe Chrome storage wrapper with caching and error handling
 */

import { logger } from './logger';

/**
 * Storage areas available in Chrome
 */
export type StorageArea = 'local' | 'sync' | 'session';

/**
 * Storage options
 */
export interface StorageOptions {
  /** Storage area to use */
  area: StorageArea;
  
  /** Key prefix for namespacing */
  prefix: string;
  
  /** TTL for cached items in milliseconds */
  defaultTTL: number;
  
  /** Enable in-memory caching */
  enableCache: boolean;
}

/**
 * Cached item with metadata
 */
interface CachedItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * Main storage class
 */
export class Storage {
  private options: StorageOptions;
  private cache: Map<string, CachedItem<unknown>> = new Map();
  private static instance: Storage | null = null;

  constructor(options: Partial<StorageOptions> = {}) {
    this.options = {
      area: options.area || 'local',
      prefix: options.prefix || 'vd:',
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 5 minutes
      enableCache: options.enableCache ?? true
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage();
    }
    return Storage.instance;
  }

  /**
   * Get prefixed storage key
   */
  private getKey(key: string): string {
    return `${this.options.prefix}${key}`;
  }

  /**
   * Get Chrome storage area instance
   */
  private getStorageArea(): chrome.storage.StorageArea {
    switch (this.options.area) {
      case 'sync':
        return chrome.storage.sync;
      case 'session':
        // @ts-ignore - session storage may not be available in all contexts
        return chrome.storage.session || chrome.storage.local;
      case 'local':
      default:
        return chrome.storage.local;
    }
  }

  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const storageKey = this.getKey(key);
      const item: CachedItem<T> = {
        value,
        timestamp: Date.now(),
        ttl: ttl ?? this.options.defaultTTL
      };

      // Update cache
      if (this.options.enableCache) {
        this.cache.set(storageKey, item);
      }

      // Update storage
      const storageArea = this.getStorageArea();
      await storageArea.set({ [storageKey]: item });
      
      logger.debug('Storage set successful', { key, hasValue: value !== undefined });
      return true;
    } catch (error) {
      logger.error('Storage set failed', { key, error });
      return false;
    }
  }

  /**
   * Get a value from storage
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const storageKey = this.getKey(key);
      
      // Check cache first
      if (this.options.enableCache) {
        const cached = this.cache.get(storageKey) as CachedItem<T> | undefined;
        if (cached) {
          const isExpired = Date.now() - cached.timestamp > cached.ttl;
          if (!isExpired) {
            logger.debug('Storage get from cache', { key });
            return cached.value;
          } else {
            // Remove expired item
            this.cache.delete(storageKey);
            logger.debug('Storage cache expired', { key });
          }
        }
      }

      // Fetch from storage
      const storageArea = this.getStorageArea();
      const result = await storageArea.get(storageKey);
      const item = result[storageKey] as CachedItem<T> | undefined;

      if (!item) {
        logger.debug('Storage get not found', { key });
        return null;
      }

      // Check if expired
      const isExpired = Date.now() - item.timestamp > item.ttl;
      if (isExpired) {
        logger.debug('Storage get expired', { key });
        await this.remove(key);
        return null;
      }

      // Update cache
      if (this.options.enableCache) {
        this.cache.set(storageKey, item);
      }

      logger.debug('Storage get successful', { key, hasValue: item.value !== undefined });
      return item.value;
    } catch (error) {
      logger.error('Storage get failed', { key, error });
      return null;
    }
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<boolean> {
    try {
      const storageKey = this.getKey(key);
      
      // Remove from cache
      if (this.options.enableCache) {
        this.cache.delete(storageKey);
      }

      // Remove from storage
      const storageArea = this.getStorageArea();
      await storageArea.remove(storageKey);
      
      logger.debug('Storage remove successful', { key });
      return true;
    } catch (error) {
      logger.error('Storage remove failed', { key, error });
      return false;
    }
  }

  /**
   * Clear all storage with prefix
   */
  async clear(): Promise<boolean> {
    try {
      const storageArea = this.getStorageArea();
      const allData = await storageArea.get(null);
      
      const keysToRemove = Object.keys(allData).filter(key => 
        key.startsWith(this.options.prefix)
      );

      if (keysToRemove.length > 0) {
        await storageArea.remove(keysToRemove);
      }

      // Clear cache
      if (this.options.enableCache) {
        this.cache.clear();
      }

      logger.info('Storage cleared', { keysRemoved: keysToRemove.length });
      return true;
    } catch (error) {
      logger.error('Storage clear failed', error);
      return false;
    }
  }

  /**
   * Get all keys with prefix
   */
  async keys(): Promise<string[]> {
    try {
      const storageArea = this.getStorageArea();
      const allData = await storageArea.get(null);
      
      const keys = Object.keys(allData)
        .filter(key => key.startsWith(this.options.prefix))
        .map(key => key.substring(this.options.prefix.length));

      logger.debug('Storage keys retrieved', { count: keys.length });
      return keys;
    } catch (error) {
      logger.error('Storage keys retrieval failed', error);
      return [];
    }
  }

  /**
   * Get multiple values
   */
  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    
    await Promise.all(
      keys.map(async key => {
        result[key] = await this.get<T>(key);
      })
    );
    
    return result;
  }

  /**
   * Set multiple values
   */
  async setMultiple<T>(data: Record<string, T>, ttl?: number): Promise<boolean> {
    const entries = Object.entries(data);
    const results = await Promise.all(
      entries.map(([key, value]) => this.set(key, value, ttl))
    );
    
    return results.every(result => result);
  }

  /**
   * Update existing value
   */
  async update<T>(key: string, updater: (current: T | null) => T): Promise<boolean> {
    try {
      const current = await this.get<T>(key);
      const newValue = updater(current);
      return await this.set(key, newValue);
    } catch (error) {
      logger.error('Storage update failed', { key, error });
      return false;
    }
  }

  /**
   * Clean expired items from storage
   */
  async cleanup(): Promise<void> {
    try {
      const keys = await this.keys();
      const now = Date.now();
      let cleanedCount = 0;

      await Promise.all(
        keys.map(async key => {
          const storageKey = this.getKey(key);
          const storageArea = this.getStorageArea();
          const result = await storageArea.get(storageKey);
          const item = result[storageKey] as CachedItem<unknown> | undefined;

          if (item && now - item.timestamp > item.ttl) {
            await this.remove(key);
            cleanedCount++;
          }
        })
      );

      if (cleanedCount > 0) {
        logger.info('Storage cleanup completed', { cleanedCount });
      }
    } catch (error) {
      logger.error('Storage cleanup failed', error);
    }
  }

  /**
   * Get storage size
   */
  async size(): Promise<number> {
    try {
      const keys = await this.keys();
      return keys.length;
    } catch (error) {
      logger.error('Storage size calculation failed', error);
      return 0;
    }
  }
}

/**
 * Default storage instance
 */
export const storage = Storage.getInstance();

/**
 * Session storage instance (shorter TTL)
 */
export const sessionStorage = new Storage({
  area: 'session',
  prefix: 'vd:session:',
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  enableCache: true
});

/**
 * Settings storage instance (longer TTL)
 */
export const settingsStorage = new Storage({
  area: 'sync',
  prefix: 'vd:settings:',
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  enableCache: true
});
