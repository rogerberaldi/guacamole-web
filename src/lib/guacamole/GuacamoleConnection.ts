import { logger } from '../utils/logger';
import { JWTAuthManager } from '../auth/JWTAuthManager';
import { ClipboardManager } from './ClipboardManager';
import { KeyboardStateManager } from './KeyboardStateManager';
import { MouseCursorManager } from './MouseCursorManager';
import { ResolutionManager } from './ResolutionManager';

import Guacamole from "guacamole-common-js";


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
    try {
      // Use the exact same pattern as working version
      const wsURL = this.config.websocketURL; // No parameters
      logger.info('Creating WebSocket tunnel', { wsURL });
      
      this.tunnel = new Guacamole.WebSocketTunnel(wsURL);

      // Setup handlers
      this.tunnel.onerror = (status: any) => {
        logger.error('Tunnel error', status);
        this.handleError(`Connection error: ${status.message || 'Unknown error'}`);
      };

      this.tunnel.onstatechange = (state: number) => {
        logger.debug('Tunnel state changed', { state });
      };

      // Create client
      this.client = new Guacamole.Client(this.tunnel);
      this.setupClientHandlers();
      this.__setupInputHandlers();
      
      // Get connection string exactly like working version
      const connectionString = this.authManager.getConnectionParams();
      logger.info('Connecting with parameters', { 
        connectionString,
        token: this.authManager.getToken(),
        guacId: this.authManager.getGuacId()
      });
      
      // Connect with parameters
      this.client.connect(connectionString);
      
    } catch (error) {
      logger.error('Connection initialization failed', error);
      this.handleError(`Connection failed: ${error}`);
    }
  }
  
  private setupClientHandlers(): void {
  
    this.client.onstatechange = (state: number) => {
      const stateNames = ['IDLE', 'CONNECTING', 'WAITING', 'CONNECTED', 'DISCONNECTING', 'DISCONNECTED'];
      const stateName = stateNames[state] || `UNKNOWN (${state})`;
      
      logger.debug('Client state changed', { state, stateName });

      if (state === 3) { // CONNECTED
        this.onConnected();
      } else if (state === 5) { // DISCONNECTED
        this.onDisconnected();
      } else if (state === 4) { // DISCONNECTING
        logger.info('Client disconnecting...');
      }
    };

    this.client.onerror = (status: any) => {
      logger.error('Client error occurred', { 
        status,
        statusCode: status?.code,
        statusMessage: status?.message,
        connectionState: this.state
      });
      this.handleError(`Client error: ${status.message || 'Unknown error'}`);
    };

    
    this.client.onname = (name: string) => {
      logger.info('Connection name received', { name });
      document.title = `Remote Desktop - ${name}`;
    };

    this.client.onsync = (timestamp: number) => {
      logger.debug('Sync received - client and server are synchronized', { timestamp });
    };
    
  }


  private setupInputHandlers(): void {
  if (!this.container) {
    return;
  }

  this.display = this.client.getDisplay();
  const displayElement = this.display.getElement();

  // Clear the container and append the display element directly
  this.container.innerHTML = '';
  this.container.appendChild(displayElement);

  // Let Guacamole handle the display
  this.display.onresize = (width: number, height: number) => {
    logger.debug('Display resized by Guacamole', { width, height });
  };

  // Setup mouse and keyboard
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

  // Initialize managers
  this.clipboardManager = new ClipboardManager(this.client);
  this.keyboardStateManager = new KeyboardStateManager(this.client, this.keyboard);
  this.mouseCursorManager = new MouseCursorManager(this.display, displayElement);
  this.resolutionManager = new ResolutionManager(this.client, this.container);

  logger.info('Input handlers configured');
}

  private _setupInputHandlers(): void {

    if (!this.container) {
      logger.error('Cannot setup input handlers: container is null');
      return;
    }

    this.display = this.client.getDisplay();
    const displayElement = this.display.getElement();

    // Clear the container and append the display element directly
    this.container.innerHTML = '';
    this.container.appendChild(displayElement);
    
    // Style the container to be black (so resizing doesn't show white)
    this.container.style.backgroundColor = 'black';

    // Let Guacamole's display object manage its own size
    // We just need to tell it to scale to fit its container (this.container)
    this.display.onresize = (width: number, height: number) => {
      logger.debug('Display resized by Guacamole', { width, height });

      if (width === 0 || height === 0) {
        return; // Avoid divide-by-zero
      }

      // Calculate scale to fit container
      const containerWidth = this.container.clientWidth;
      const containerHeight = this.container.clientHeight;

      // Get the minimum scale to fit and maintain aspect ratio
      const scale = Math.min(
        containerWidth / width,   // Scale by width
        containerHeight / height  // Scale by height
      );
      
      this.display.scale(scale);
      logger.debug('Display scale set', { scale, containerWidth, containerHeight });
    };

    // Force initial display update
    setTimeout(() => {
      if (this.display.getWidth() > 0 && this.display.getHeight() > 0) {
        this.display.onresize(this.display.getWidth(), this.display.getHeight());
      }
    }, 100);

    // Setup mouse and keyboard
    // We attach the mouse to the *container* so it can capture events
    // even if the display element doesn't fill it.
    this.mouse = new Guacamole.Mouse(this.container);
    this.keyboard = new Guacamole.Keyboard(document);

    this.mouse.onmousedown =
      this.mouse.onmouseup =
      this.mouse.onmousemove =
        (mouseState: any) => {
          if (this.client) {
            // We need to scale the mouse coordinates from the container
            // back to the display's (unscaled) coordinates
            const scale = this.display.getScale();
            
            // Prevent divide by zero if scale is 0
            if (scale === 0) return;

            mouseState.x = mouseState.x / scale;
            mouseState.y = mouseState.y / scale;
            
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

    // Initialize managers
    this.clipboardManager = new ClipboardManager(this.client);
    this.keyboardStateManager = new KeyboardStateManager(this.client, this.keyboard);
    // Pass the container (which has cursor:none) to the MouseCursorManager
    this.mouseCursorManager = new MouseCursorManager(this.display, this.container);
    
    // We still use ResolutionManager, but its job is now just to
    // tell the server the *maximum* size we can handle, not the *exact* size.
    // The display.setScale() logic will handle the visual fitting.
    this.resolutionManager = new ResolutionManager(this.client, this.container);

    logger.info('Input handlers re-configured (simplified)');
  }

  private __setupInputHandlers(): void {

    if (!this.container) {
      return;
    }

    this.display = this.client.getDisplay();
    const displayElement = this.display.getElement();


    // Clear container and append display
    this.container.innerHTML = '';    
    this.container.appendChild(displayElement);

    // Style the container to be black (so resizing doesn't show white)
    this.container.style.backgroundColor = 'black';


    this.addVisualDebugging();
    //this.setupDisplayDebugging();
    

    // Add display event listeners

    this.display.onresize = (width: number, height: number) => {
      logger.debug('Display resized', { width, height });
      if (!(width === 0 || height === 0)) {
        
        // Calculate scale to fit container
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        
        // Get the minimum scale to fit and maintain aspect ratio
        const scale = Math.min(
          containerWidth / width,   // Scale by width
          containerHeight / height, // Scale by height
          1.0                      // Maximum scale (don't scale up beyond 100%)
        );
        
        this.display.scale(scale);
        logger.debug('Display scaled', { scale, container: `${containerWidth}x${containerHeight}`, display: `${width}x${height}` });
      }
      else {
        logger.warn('width or height == 0')
      }
    };

    this.display.onflush = (canvas: HTMLCanvasElement) => {
      logger.debug('Display flushed - frame rendered', {canvas});
    };
  
    // Force initial display update
    setTimeout(() => {
    if (this.display.getWidth() > 0 && this.display.getHeight() > 0) {
      this.display.onresize(this.display.getWidth(), this.display.getHeight());
    }
    }, 100);

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

    // Log display information
    if (this.display) {
      logger.debug('Display information on connect', {
        width: this.display.getWidth(),
        height: this.display.getHeight(),
        scale: this.display.getScale()
      });
    }

        // Force display refresh
    setTimeout(() => {
      if (this.display) {
        this.display.flush();
        logger.debug('Manual display flush triggered');
      }
    }, 500);
    
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

  // Add this method to GuacamoleConnection.ts
  private setupDisplayDebugging(): void {
    if (!this.display) return;

    // Override the flush method to debug canvas content - FIXED VERSION
    const originalFlush = this.display.flush;
    this.display.flush = (canvas: HTMLCanvasElement) => {
      if (canvas && canvas.width && canvas.height) {
        logger.debug('Canvas flush - checking content', {
          width: canvas.width,
          height: canvas.height,
          hasContent: canvas.width > 0 && canvas.height > 0
        });
        
        // Check if canvas has any non-black pixels (safe check)
        try {
          const context = canvas.getContext('2d');
          if (context) {
            const imageData = context.getImageData(0, 0, 1, 1);
            const pixelData = imageData.data;
            logger.debug('Top-left pixel color', {
              r: pixelData[0],
              g: pixelData[1],
              b: pixelData[2],
              a: pixelData[3]
            });
          }
        } catch (error) {
          logger.debug('Cannot read pixel data (may be tainted)', { error });
        }
      } else {
        logger.debug('Canvas flush - canvas is not ready yet');
      }
      
      return originalFlush.call(this.display, canvas);
    };
  }
  private addVisualDebugging(): void {
    if (!this.container) return;
    
    // Add a border to see the container boundaries
    this.container.style.border = '2px solid red';
    
    // Add a debug info overlay
    const debugOverlay = document.createElement('div');
    debugOverlay.style.position = 'absolute';
    debugOverlay.style.top = '10px';
    debugOverlay.style.left = '10px';
    debugOverlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    debugOverlay.style.color = 'white';
    debugOverlay.style.padding = '5px';
    debugOverlay.style.fontFamily = 'monospace';
    debugOverlay.style.fontSize = '12px';
    debugOverlay.style.zIndex = '1000';
    debugOverlay.innerHTML = 'Waiting for display...';
    
    this.container.style.position = 'relative';
    this.container.appendChild(debugOverlay);
    
    // Update debug info on resize
    const updateDebugInfo = () => {
      if (this.display) {
        const displayWidth = this.display.getWidth();
        const displayHeight = this.display.getHeight();
        const containerWidth = this.container?.clientWidth;
        const containerHeight = this.container?.clientHeight;
        
        debugOverlay.innerHTML = `
          Display: ${displayWidth}x${displayHeight}<br>
          Container: ${containerWidth}x${containerHeight}<br>
          Scale: ${this.display.getScale()}
        `;
      }
    };
    
    // Update periodically
    setInterval(updateDebugInfo, 1000);
    updateDebugInfo();
  }
}

