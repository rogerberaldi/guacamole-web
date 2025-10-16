import { logger } from '../utils/logger';

export class KeyboardStateManager {
  private client: any;
  private keyboard: any;
  private pressedKeys: Set<number> = new Set();
  private isActive: boolean = false;

  constructor(client: any, keyboard: any) {
    this.client = client;
    this.keyboard = keyboard;
    this.setupEventListeners();
    logger.info('KeyboardStateManager initialized');
  }

  private setupEventListeners(): void {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('focus', this.onWindowFocus);

    const originalKeyDown = this.keyboard.onkeydown;
    this.keyboard.onkeydown = (keysym: number): boolean => {
      this.pressedKeys.add(keysym);
      logger.debug('Key pressed', { keysym, totalPressed: this.pressedKeys.size });

      if (originalKeyDown) {
        return originalKeyDown.call(this.keyboard, keysym);
      }
      return true;
    };

    const originalKeyUp = this.keyboard.onkeyup;
    this.keyboard.onkeyup = (keysym: number): void => {
      this.pressedKeys.delete(keysym);
      logger.debug('Key released', { keysym, totalPressed: this.pressedKeys.size });

      if (originalKeyUp) {
        originalKeyUp.call(this.keyboard, keysym);
      }
    };
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      logger.debug('Page hidden, releasing all keys');
      this.releaseAllKeys();
    }
  };

  private onWindowBlur = (): void => {
    logger.debug('Window blur, releasing all keys');
    this.releaseAllKeys();
  };

  private onWindowFocus = (): void => {
    logger.debug('Window focus gained');
    this.pressedKeys.clear();
  };

  private releaseAllKeys(): void {
    if (this.pressedKeys.size === 0) {
      return;
    }

    logger.info('Releasing all pressed keys', { count: this.pressedKeys.size });

    const keysToRelease = Array.from(this.pressedKeys);

    keysToRelease.forEach((keysym) => {
      try {
        this.client.sendKeyEvent(false, keysym);
        logger.debug('Released stuck key', { keysym });
      } catch (error) {
        logger.error('Failed to release key', { keysym, error });
      }
    });

    this.pressedKeys.clear();

    if (this.keyboard && this.keyboard.reset) {
      this.keyboard.reset();
    }
  }

  activate(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    logger.info('KeyboardStateManager activated');
  }

  deactivate(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.releaseAllKeys();
    logger.info('KeyboardStateManager deactivated');
  }

  destroy(): void {
    this.deactivate();

    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('focus', this.onWindowFocus);

    this.client = null;
    this.keyboard = null;
    logger.info('KeyboardStateManager destroyed');
  }
}
