import { logger } from '../utils/logger.js';

export interface AuthToken {
  accessToken: string;
  expiresAt: Date;
  refreshToken?: string;
}

export class AuthManager {
  private cradlepointToken: AuthToken | null = null;
  private peplinkApiKey: string | null = null;
  private starlinkApiKey: string | null = null;

  constructor() {
    this.peplinkApiKey = process.env.PEPLINK_API_KEY || null;
    this.starlinkApiKey = process.env.STARLINK_API_KEY || null;
  }

  async getCradlepointToken(): Promise<string> {
    if (this.cradlepointToken && new Date() < this.cradlepointToken.expiresAt) {
      return this.cradlepointToken.accessToken;
    }

    return this.refreshCradlepointToken();
  }

  private async refreshCradlepointToken(): Promise<string> {
    const clientId = process.env.CRADLEPOINT_CLIENT_ID || '';
    const clientSecret = process.env.CRADLEPOINT_CLIENT_SECRET || '';
    const tokenUrl = process.env.CRADLEPOINT_TOKEN_URL || '';

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'devices:read alerts:read'
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json() as { access_token: string; expires_in: number };

      this.cradlepointToken = {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + (data.expires_in - 300) * 1000)
      };

      logger.info('Cradlepoint token refreshed successfully');
      return this.cradlepointToken.accessToken;
    } catch (error) {
      logger.error('Failed to refresh Cradlepoint token', { error });
      throw error;
    }
  }

  getPeplinkKey(): string | null {
    return this.peplinkApiKey;
  }

  getStarlinkKey(): string | null {
    return this.starlinkApiKey;
  }

  async rotatePeplinkKey(newKey: string): Promise<void> {
    logger.info('Rotating Peplink API key');
    this.peplinkApiKey = newKey;
  }

  async rotateStarlinkKey(newKey: string): Promise<void> {
    logger.info('Rotating Starlink API key');
    this.starlinkApiKey = newKey;
  }
}