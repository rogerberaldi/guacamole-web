import { logger } from '../utils/logger';

export interface ResolutionConfig {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  debounceMs: number;
}

export class ResolutionManager {
  private client: any;
  private container: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;
  private debounceTimer: number | null = null;
  private lastWidth: number = 0;
  private lastHeight: number = 0;
  private isActive: boolean = false;

  private config: ResolutionConfig = {
    minWidth: 640,
    minHeight: 480,
    maxWidth: 4096,
    maxHeight: 4096,
    debounceMs: 250,
  };

  constructor(client: any, container: HTMLElement, config?: Partial<ResolutionConfig>) {
    this.client = client;
    this.container = container;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    logger.info('ResolutionManager initialized', this.config);
  }

  start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;

    this.sendInitialSize();

    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleResize();
    });

    this.resizeObserver.observe(this.container);

    window.addEventListener('resize', this.onWindowResize);

    logger.info('ResolutionManager started');
  }

  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    window.removeEventListener('resize', this.onWindowResize);

    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    logger.info('ResolutionManager stopped');
  }

  private onWindowResize = (): void => {
    this.scheduleResize();
  };

  private scheduleResize(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.performResize();
      this.debounceTimer = null;
    }, this.config.debounceMs);
  }

  private sendInitialSize(): void {
    const { width, height } = this.calculateOptimalSize();
    this.sendSizeUpdate(width, height);
  }

  private performResize(): void {
    const { width, height } = this.calculateOptimalSize();

    if (width === this.lastWidth && height === this.lastHeight) {
      logger.debug('Resolution unchanged, skipping update');
      return;
    }

    this.sendSizeUpdate(width, height);
  }

  private calculateOptimalSize(): { width: number; height: number } {
    const rect = this.container.getBoundingClientRect();

    // Ensure we have valid dimensions
    let containerWidth = Math.max(1, rect.width);
    let containerHeight = Math.max(1, rect.height);

    const devicePixelRatio = window.devicePixelRatio || 1;

    let width = Math.floor(containerWidth * devicePixelRatio);
    let height = Math.floor(containerHeight * devicePixelRatio);

    // Apply constraints
    width = Math.max(this.config.minWidth, Math.min(width, this.config.maxWidth));
    height = Math.max(this.config.minHeight, Math.min(height, this.config.maxHeight));

    width = Math.floor(width / 4) * 4;
    height = Math.floor(height / 4) * 4;

    logger.debug('Calculated optimal size', {
      containerWidth: rect.width,
      containerHeight: rect.height,
      devicePixelRatio,
      optimalWidth: width,
      optimalHeight: height,
    });

    return { width, height };
  }

  private sendSizeUpdate(width: number, height: number): void {
    if (!this.client) {
      logger.warn('Cannot send size update: client not available');
      return;
    }

    try {
      this.client.sendSize(width, height);
      this.lastWidth = width;
      this.lastHeight = height;

      logger.info('Resolution update sent to remote', { width, height });
    } catch (error) {
      logger.error('Failed to send size update', error);
    }
  }

  forceResize(): void {
    logger.info('Force resize requested');
    this.performResize();
  }

  destroy(): void {
    this.stop();
    this.client = null;
    logger.info('ResolutionManager destroyed');
  }
}
