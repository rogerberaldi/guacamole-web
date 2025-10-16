import { logger } from '../utils/logger';
import { JWTAuthManager } from '../auth/JWTAuthManager';
import { ClipboardManager } from './ClipboardManager';
import { KeyboardStateManager } from './KeyboardStateManager';
import { MouseCursorManager } from './MouseCursorManager';
import { ResolutionManager } from './ResolutionManager';
import Guacamole from 'guacamole-common-js';

declare const Guacamole: any;

export enum ConnectionState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
}

export interface ConnectionConfig {
  websocketURL: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

export class GuacamoleConnection {
  private config: ConnectionConfig;
  private authManager: JWTAuthManager;

  private client: any = null;
  private tunnel: any = null;
  private display: any = null;
  private mouse: any = null;
  private keyboard: any = null;

  private clipboardManager: ClipboardManager | null = null;
  private keyboardStateManager: KeyboardStateManager | null = null;
  private mouseCursorManager: MouseCursorManager | null = null;
  private resolutionManager: ResolutionManager | null = null;

  private container: HTMLElement | null = null;
  private state: ConnectionState = ConnectionState.IDLE;

  private onStateChangeCallback: ((state: ConnectionState) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor(config: ConnectionConfig, authManager: JWTAuthManager) {
    this.config = config;
    this.authManager = authManager;

    logger.info('GuacamoleConnection created', { websocketURL: config.websocketURL });
  }

  connect(container: HTMLElement): void {
    if (this.state !== ConnectionState.IDLE && this.state !== ConnectionState.DISCONNECTED) {
      logger.warn('Connection already active or in progress');
      return;
    }

    if (!this.authManager.isValid()) {
      this.handleError('Invalid or expired JWT token');
      return;
    }

    this.container = container;
    this.setState(ConnectionState.CONNECTING);

    try {
      this.initializeConnection();
    } catch (error) {
      this.handleError(`Connection initialization failed: ${error}`);
    }
  }

  private initializeConnection(): void {
    const wsURL = this.authManager.buildWebSocketURL(this.config.websocketURL);

    logger.info('Creating WebSocket tunnel', { wsURL });
    this.tunnel = new Guacamole.WebSocketTunnel(wsURL);

    this.tunnel.onerror = (status: any) => {
      logger.error('Tunnel error', status);
      this.handleError(`Connection error: ${status.message || 'Unknown error'}`);
    };

    this.tunnel.onstatechange = (state: number) => {
      logger.debug('Tunnel state changed', { state });
    };

    logger.info('Creating Guacamole client');
    this.client = new Guacamole.Client(this.tunnel);

    this.setupClientHandlers();
    this.setupInputHandlers();

    const connectionParams = this.authManager.getConnectionParams();
    const dataString = this.buildConnectionString(connectionParams);

    logger.info('Connecting to Guacamole', { params: connectionParams });
    this.client.connect(dataString);
  }

  private buildConnectionString(params: Record<string, string>): string {
    const parts: string[] = [];

    Object.entries(params).forEach(([key, value]) => {
      parts.push(key);
      parts.push(value);
    });

    return parts.join('\0');
  }

  private setupClientHandlers(): void {
    this.client.onstatechange = (state: number) => {
      logger.debug('Client state changed', { state });

      if (state === 3) {
        this.onConnected();
      } else if (state === 5) {
        this.onDisconnected();
      }
    };

    this.client.onerror = (status: any) => {
      logger.error('Client error', status);
      this.handleError(`Client error: ${status.message || 'Unknown error'}`);
    };

    this.client.onname = (name: string) => {
      logger.info('Connection name received', { name });
      document.title = `Remote Desktop - ${name}`;
    };

    this.client.onsync = (timestamp: number) => {
      logger.debug('Sync received', { timestamp });
    };
  }

  private setupInputHandlers(): void {
    if (!this.container) {
      return;
    }

    this.display = this.client.getDisplay();
    const displayElement = this.display.getElement();
    displayElement.style.width = '100%';
    displayElement.style.height = '100%';
    this.container.appendChild(displayElement);

    this.mouse = new Guacamole.Mouse(displayElement);
    this.keyboard = new Guacamole.Keyboard(document);

    this.mouse.onmousedown =
      this.mouse.onmouseup =
      this.mouse.onmousemove =
        (mouseState: any) => {
          if (this.client) {
            this.client.sendMouseState(mouseState);
          }
        };

    this.keyboard.onkeydown = (keysym: number) => {
      if (this.client) {
        this.client.sendKeyEvent(true, keysym);
      }
      return true;
    };

    this.keyboard.onkeyup = (keysym: number) => {
      if (this.client) {
        this.client.sendKeyEvent(false, keysym);
      }
    };

    this.clipboardManager = new ClipboardManager(this.client);
    this.keyboardStateManager = new KeyboardStateManager(this.client, this.keyboard);
    this.mouseCursorManager = new MouseCursorManager(this.display, displayElement);
    this.resolutionManager = new ResolutionManager(this.client, this.container);

    logger.info('Input handlers configured');
  }

  private onConnected(): void {
    logger.info('Connection established');
    this.setState(ConnectionState.CONNECTED);

    this.clipboardManager?.startMonitoring();
    this.keyboardStateManager?.activate();
    this.resolutionManager?.start();
  }

  private onDisconnected(): void {
    logger.info('Connection closed');
    this.setState(ConnectionState.DISCONNECTED);
    this.cleanup();
  }

  disconnect(): void {
    if (
      this.state === ConnectionState.DISCONNECTED ||
      this.state === ConnectionState.DISCONNECTING
    ) {
      return;
    }

    logger.info('Disconnecting...');
    this.setState(ConnectionState.DISCONNECTING);

    if (this.client) {
      this.client.disconnect();
    } else {
      this.onDisconnected();
    }
  }

  private cleanup(): void {
    logger.info('Cleaning up connection resources');

    this.clipboardManager?.destroy();
    this.keyboardStateManager?.destroy();
    this.mouseCursorManager?.destroy();
    this.resolutionManager?.destroy();

    this.clipboardManager = null;
    this.keyboardStateManager = null;
    this.mouseCursorManager = null;
    this.resolutionManager = null;

    if (this.display && this.container) {
      const displayElement = this.display.getElement();
      if (displayElement && displayElement.parentNode === this.container) {
        this.container.removeChild(displayElement);
      }
    }

    this.client = null;
    this.tunnel = null;
    this.display = null;
    this.mouse = null;
    this.keyboard = null;
    this.container = null;
  }

  private handleError(error: string): void {
    logger.error('Connection error', { error });
    this.setState(ConnectionState.ERROR);

    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }

    this.cleanup();
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) {
      return;
    }

    const oldState = this.state;
    this.state = newState;

    logger.info('Connection state changed', { from: oldState, to: newState });

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  onStateChange(callback: (state: ConnectionState) => void): void {
    this.onStateChangeCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }
}
