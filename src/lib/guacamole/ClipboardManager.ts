import { logger } from '../utils/logger';
import Guacamole from 'guacamole-common-js'; // Add this import

export class ClipboardManager {
  private client: any;
  private lastLocalClipboard: string = '';
  private lastRemoteClipboard: string = '';
  private clipboardCheckInterval: number | null = null;
  private isMonitoring: boolean = false;

  constructor(client: any) {
    this.client = client;
    this.setupRemoteClipboardHandler();
    logger.info('ClipboardManager initialized');
  }

  private setupRemoteClipboardHandler(): void {
    this.client.onclipboard = (stream: any, mimetype: string) => {
      logger.debug('Receiving remote clipboard data', { mimetype });

      if (mimetype === 'text/plain') {
        const reader = new Guacamole.StringReader(stream);
        let clipboardData = '';

        reader.ontext = (text: string) => {
          clipboardData += text;
        };

        reader.onend = () => {
          this.lastRemoteClipboard = clipboardData;
          this.updateLocalClipboard(clipboardData);
        };
      }
    };
  }

  private async updateLocalClipboard(text: string): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        this.lastLocalClipboard = text;
        logger.debug('Local clipboard updated via Clipboard API');
      } else {
        this.fallbackCopyToClipboard(text);
      }
    } catch (error) {
      logger.warn('Failed to update local clipboard, trying fallback', error);
      this.fallbackCopyToClipboard(text);
    }
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.lastLocalClipboard = text;
        logger.debug('Local clipboard updated via fallback method');
      } else {
        logger.error('Fallback clipboard copy failed');
      }
    } catch (error) {
      logger.error('Fallback clipboard copy error', error);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  private async checkLocalClipboard(): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();

        if (text && text !== this.lastLocalClipboard && text !== this.lastRemoteClipboard) {
          this.lastLocalClipboard = text;
          this.sendToRemote(text);
        }
      }
    } catch (error) {
      logger.debug('Cannot read clipboard (likely no permission)', error);
    }
  }

  private sendToRemote(text: string): void {
    if (!this.client || !text) {
      return;
    }

    try {
      const stream = this.client.createArgumentValueStream('text/plain', 'clipboard');

      const writer = new Guacamole.StringWriter(stream);
      writer.sendText(text);
      writer.sendEnd();

      logger.debug('Clipboard data sent to remote', { length: text.length });
    } catch (error) {
      logger.error('Failed to send clipboard to remote', error);
    }
  }

  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    this.clipboardCheckInterval = window.setInterval(() => {
      this.checkLocalClipboard();
    }, 1000);

    window.addEventListener('focus', this.onWindowFocus);
    window.addEventListener('paste', this.onPaste);

    logger.info('Clipboard monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.clipboardCheckInterval !== null) {
      window.clearInterval(this.clipboardCheckInterval);
      this.clipboardCheckInterval = null;
    }

    window.removeEventListener('focus', this.onWindowFocus);
    window.removeEventListener('paste', this.onPaste);

    logger.info('Clipboard monitoring stopped');
  }

  private onWindowFocus = (): void => {
    this.checkLocalClipboard();
  };

  private onPaste = async (event: ClipboardEvent): Promise<void> => {
    event.preventDefault();

    const text = event.clipboardData?.getData('text/plain');
    if (text) {
      this.lastLocalClipboard = text;
      this.sendToRemote(text);
    }
  };

  destroy(): void {
    this.stopMonitoring();
    this.client = null;
    logger.info('ClipboardManager destroyed');
  }
}
