import { logger } from '../utils/logger';

/*
export interface JWTPayload {
  sub: string;
  exp: number;
  connection: {
    protocol: string;
    hostname: string;
    port: number;
    username?: string;
    password?: string;
    domain?: string;
    security?: string;
    'ignore-cert'?: boolean;
    'resize-method'?: string;
    'enable-wallpaper'?: boolean;
    'enable-theming'?: boolean;
    'enable-font-smoothing'?: boolean;
    'enable-full-window-drag'?: boolean;
    'enable-desktop-composition'?: boolean;
    'enable-menu-animations'?: boolean;
    'disable-bitmap-caching'?: boolean;
    'disable-offscreen-caching'?: boolean;
    'disable-glyph-caching'?: boolean;
  };
}
*/
export class JWTAuthManager {
  private token: string | null = null;
  private guacId: string | null = null;
  private guacType: string | null = "c";
  private guacDataSource: string | null = "jwt";
  //private payload: JWTPayload | null = null;

  constructor() {
    this.extractTokenFromURL();
  }

  private extractTokenFromURL(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromURL = urlParams.get('token');
    const guacIdFromURL = urlParams.get('GUAC_ID');
    
    
    if (tokenFromURL) {
      //this.token(tokenFromURL);
      this.token = tokenFromURL;
      window.history.replaceState({}, document.title, window.location.pathname);
      logger.info('JWT token extracted from URL');
    }
    if (guacIdFromURL) {
      this.guacId = guacIdFromURL;
      window.history.replaceState({}, document.title, window.location.pathname);
      logger.info('GUAC_ID extracted from URL');
    }
    
    if (!this.token) {
      logger.warn('No JWT token found in URL');
    }
    if (!this.guacId) {
      logger.warn('No GUAC_ID found in URL');
    }
  }

  /*
  setToken(token: string): void {
    this.token = token;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payloadBase64 = parts[1];
      const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      this.payload = JSON.parse(payloadJson) as JWTPayload;

      if (this.isExpired()) {
        logger.warn('JWT token is expired');
        throw new Error('Token expired');
      }

      logger.info('JWT token set successfully', {
        sub: this.payload.sub,
        exp: new Date(this.payload.exp * 1000).toISOString(),
      });
    } catch (error) {
      logger.error('Failed to parse JWT token', error);
      this.token = null;
      this.payload = null;
      throw error;
    }
  }
*/
  getToken(): string | null {
    return this.token;
  }

  /*getPayload(): JWTPayload | null {
    return this.payload;
  }*/

    /*
  getConnectionParams(): Record<string, string> {
    if (!this.payload?.connection) {
      return {};
    }

    const params: Record<string, string> = {};
    const conn = this.payload.connection;

    Object.entries(conn).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params[key] = String(value);
      }
    });

    return params;
  }
*/
  /*
  isExpired(): boolean {
    if (!this.payload?.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return now >= this.payload.exp;
  }
*/
  isValid(): boolean {
    return this.token !== null && this.guacId !== null;
  }

  clear(): void {
    this.token = null;
    this.guacId = null;
  
    logger.info('JWT token cleared');
  }

  buildWebSocketURL(baseURL: string): string {
    if (!this.token) {
      throw new Error('No JWT token available');
    }
    if (!this.guacId) {
      throw new Error('No GUAC_ID available');
    }

    const url = new URL(baseURL);
    url.searchParams.set('token', this.token);
    url.searchParams.set('GUAC_ID', this.guacId);
    url.searchParams.set('GUAC_TYPE', this.guacType || "c");
    url.searchParams.set('GUAC_DATA_SOURCE', this.guacDataSource || "jwt");

    logger.debug('WebSocket URL built', { url: url.toString() });
    return url.toString();
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.token) {
      return {};
    }

    return {
      Authorization: `Bearer ${this.token}`,
    };
  }
}
