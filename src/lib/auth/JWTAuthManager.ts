import { logger } from '../utils/logger';

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

export class JWTAuthManager {
  private token: string | null = null;
  private payload: JWTPayload | null = null;

  constructor() {
    this.extractTokenFromURL();
  }

  private extractTokenFromURL(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromURL = urlParams.get('token');

    if (tokenFromURL) {
      this.setToken(tokenFromURL);
      window.history.replaceState({}, document.title, window.location.pathname);
      logger.info('JWT token extracted from URL');
    }
  }

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

  getToken(): string | null {
    return this.token;
  }

  getPayload(): JWTPayload | null {
    return this.payload;
  }

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

  isExpired(): boolean {
    if (!this.payload?.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return now >= this.payload.exp;
  }

  isValid(): boolean {
    return this.token !== null && this.payload !== null && !this.isExpired();
  }

  clear(): void {
    this.token = null;
    this.payload = null;
    logger.info('JWT token cleared');
  }

  buildWebSocketURL(baseURL: string): string {
    if (!this.token) {
      throw new Error('No JWT token available');
    }

    const url = new URL(baseURL);
    url.searchParams.set('token', this.token);

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
