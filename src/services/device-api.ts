import axios, { AxiosInstance, AxiosError } from 'axios';
import { DeviceType } from '../models/index.js';
import { logger } from '../utils/logger.js';

export interface DeviceHealth {
  deviceId: string;
  deviceType: DeviceType;
  status: 'online' | 'offline' | 'degraded';
  lastCheck: string;
  details?: Record<string, unknown>;
}

export interface DeviceInfo {
  id: string;
  type: DeviceType;
  name: string;
  network?: string;
  metadata?: Record<string, unknown>;
}

const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW = 60000;

export class DeviceAPIClient {
  private cradlepointClient: AxiosInstance | null = null;
  private peplinkClient: AxiosInstance | null = null;
  private starlinkClient: AxiosInstance | null = null;

  private cradlepointToken: string | null = null;
  private tokenExpiry: Date | null = null;

  private requestCounts: Map<string, number> = new Map();
  private lastRequestTimes: Map<string, number> = new Map();

  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    if (process.env.CRADLEPOINT_BASE_URL) {
      this.cradlepointClient = axios.create({
        baseURL: process.env.CRADLEPOINT_BASE_URL,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (process.env.PEPLINK_BASE_URL) {
      this.peplinkClient = axios.create({
        baseURL: process.env.PEPLINK_BASE_URL,
        headers: { 'X-Peplink-Key': process.env.PEPLINK_API_KEY || '' }
      });
    }

    if (process.env.STARLINK_BASE_URL) {
      this.starlinkClient = axios.create({
        baseURL: process.env.STARLINK_BASE_URL,
        headers: { 'Authorization': `Bearer ${process.env.STARLINK_API_KEY || ''}` }
      });
    }
  }

  private async checkRateLimit(provider: string): Promise<void> {
    const now = Date.now();
    const lastTime = this.lastRequestTimes.get(provider) || 0;
    const count = this.requestCounts.get(provider) || 0;

    if (now - lastTime > RATE_LIMIT_WINDOW) {
      this.requestCounts.set(provider, 1);
      this.lastRequestTimes.set(provider, now);
      return;
    }

    if (count >= RATE_LIMIT_MAX) {
      const waitTime = RATE_LIMIT_WINDOW - (now - lastTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCounts.set(provider, 1);
      this.lastRequestTimes.set(provider, Date.now());
      return;
    }

    this.requestCounts.set(provider, count + 1);
  }

  private async getCradlepointToken(): Promise<string> {
    if (this.cradlepointToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.cradlepointToken;
    }

    const clientId = process.env.CRADLEPOINT_CLIENT_ID || '';
    const clientSecret = process.env.CRADLEPOINT_CLIENT_SECRET || '';

    const response = await axios.post(`${process.env.CRADLEPOINT_BASE_URL}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'devices:read alerts:read'
    });

    this.cradlepointToken = response.data.access_token as string;
    const expiresIn = response.data.expires_in || 3600;
    this.tokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000);

    logger.info('Cradlepoint OAuth2 token refreshed');
    return this.cradlepointToken;
  }

  async healthCheck(deviceId: string, deviceType: DeviceType): Promise<DeviceHealth> {
    await this.checkRateLimit(deviceType);

    try {
      switch (deviceType) {
        case DeviceType.CRADLEPOINT:
          return this.cradlepointHealthCheck(deviceId);
        case DeviceType.PEPLINK:
          return this.peplinkHealthCheck(deviceId);
        case DeviceType.STARLINK:
          return this.starlinkHealthCheck(deviceId);
        default:
          throw new Error(`Unknown device type: ${deviceType}`);
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Device health check failed', { deviceId, deviceType, error: axiosError.message });
      return {
        deviceId,
        deviceType,
        status: 'offline',
        lastCheck: new Date().toISOString()
      };
    }
  }

  private async cradlepointHealthCheck(deviceId: string): Promise<DeviceHealth> {
    if (!this.cradlepointClient) {
      throw new Error('Cradlepoint client not initialized');
    }

    const token = await this.getCradlepointToken();
    const response = await this.cradlepointClient.get(`/devices/${deviceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const device = response.data;
    return {
      deviceId,
      deviceType: DeviceType.CRADLEPOINT,
      status: device.status === 'active' ? 'online' : 'degraded',
      lastCheck: new Date().toISOString(),
      details: device
    };
  }

  private async peplinkHealthCheck(deviceId: string): Promise<DeviceHealth> {
    if (!this.peplinkClient) {
      throw new Error('Peplink client not initialized');
    }

    const response = await this.peplinkClient.get(`/router/${deviceId}/status`);

    return {
      deviceId,
      deviceType: DeviceType.PEPLINK,
      status: response.data.connected ? 'online' : 'offline',
      lastCheck: new Date().toISOString(),
      details: response.data
    };
  }

  private async starlinkHealthCheck(deviceId: string): Promise<DeviceHealth> {
    if (!this.starlinkClient) {
      throw new Error('Starlink client not initialized');
    }

    const response = await this.starlinkClient.get(`/v1/devices/${deviceId}/status`);

    return {
      deviceId,
      deviceType: DeviceType.STARLINK,
      status: response.data.status === 'online' ? 'online' : 'offline',
      lastCheck: new Date().toISOString(),
      details: response.data
    };
  }

  async getDevices(deviceType: DeviceType): Promise<DeviceInfo[]> {
    await this.checkRateLimit(deviceType);

    switch (deviceType) {
      case DeviceType.CRADLEPOINT:
        return this.getCradlepointDevices();
      case DeviceType.PEPLINK:
        return this.getPeplinkDevices();
      case DeviceType.STARLINK:
        return this.getStarlinkDevices();
      default:
        return [];
    }
  }

  private async getCradlepointDevices(): Promise<DeviceInfo[]> {
    if (!this.cradlepointClient) return [];
    const token = await this.getCradlepointToken();
    const response = await this.cradlepointClient.get('/devices', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.devices.map((d: Record<string, unknown>) => ({
      id: d.id as string,
      type: DeviceType.CRADLEPOINT,
      name: d.name as string,
      network: d.network as string | undefined,
      metadata: d
    }));
  }

  private async getPeplinkDevices(): Promise<DeviceInfo[]> {
    if (!this.peplinkClient) return [];
    const response = await this.peplinkClient.get('/router');
    return response.data.routers.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      type: DeviceType.PEPLINK,
      name: r.name as string,
      metadata: r
    }));
  }

  private async getStarlinkDevices(): Promise<DeviceInfo[]> {
    if (!this.starlinkClient) return [];
    const response = await this.starlinkClient.get('/v1/devices');
    return response.data.devices.map((d: Record<string, unknown>) => ({
      id: d.id as string,
      type: DeviceType.STARLINK,
      name: d.name as string,
      metadata: d
    }));
  }
}