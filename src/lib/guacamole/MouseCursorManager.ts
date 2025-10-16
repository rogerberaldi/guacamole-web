import { logger } from '../utils/logger';

export class MouseCursorManager {
  private display: any;
  private container: HTMLElement;
  private isRemoteCursorVisible: boolean = false;

  constructor(display: any, container: HTMLElement) {
    this.display = display;
    this.container = container;
    this.setupCursorHandling();
    logger.info('MouseCursorManager initialized');
  }

  private setupCursorHandling(): void {
    this.display.oncursor = (
      canvas: HTMLCanvasElement,
      x: number,
      y: number
    ) => {
      logger.debug('Remote cursor updated', { x, y });

      if (canvas) {
        this.showRemoteCursor(canvas, x, y);
      } else {
        this.hideRemoteCursor();
      }
    };

    this.hideLocalCursor();
  }

  private hideLocalCursor(): void {
    this.container.style.cursor = 'none';
    logger.debug('Local cursor hidden');
  }

  private showLocalCursor(): void {
    this.container.style.cursor = 'default';
    logger.debug('Local cursor shown');
  }

  private showRemoteCursor(canvas: HTMLCanvasElement, x: number, y: number): void {
    this.isRemoteCursorVisible = true;

    const url = canvas.toDataURL('image/png');
    this.container.style.cursor = `url('${url}') ${x} ${y}, auto`;

    logger.debug('Remote cursor displayed', { hotspotX: x, hotspotY: y });
  }

  private hideRemoteCursor(): void {
    if (!this.isRemoteCursorVisible) {
      return;
    }

    this.isRemoteCursorVisible = false;
    this.container.style.cursor = 'none';
    logger.debug('Remote cursor hidden');
  }

  reset(): void {
    this.hideRemoteCursor();
    this.hideLocalCursor();
    logger.info('MouseCursorManager reset');
  }

  destroy(): void {
    this.showLocalCursor();
    this.display.oncursor = null;
    logger.info('MouseCursorManager destroyed');
  }
}
