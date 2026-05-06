import axios, { AxiosInstance } from 'axios';
import { DeviceEvent, TicketStatus } from '../models/index.js';
import { logger, logEvent, logMetric } from '../utils/logger.js';

export interface ZendeskTicketCreate {
  subject: string;
  description: string;
  priority: string;
  tags: string[];
}

export interface ZendeskTicketUpdate {
  status?: TicketStatus;
  priority?: string;
  comment?: string;
}

export class ZendeskBridge {
  private client: AxiosInstance;
  private readonly webhookUrl: string;

  constructor() {
    const baseURL = process.env.ZENDESK_BASE_URL || 'https://api.zendesk.com/api/v2';
    const email = process.env.ZENDESK_EMAIL || '';
    const apiToken = process.env.ZENDESK_API_TOKEN || '';

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${email}/token:${apiToken}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    this.webhookUrl = process.env.ZENDESK_WEBHOOK_URL || '';
  }

  async createTicket(event: DeviceEvent): Promise<string> {
    const subject = `${event.deviceType} - ${event.eventType} - ${event.partitionKey}`;
    const tags = [event.deviceType.toLowerCase(), event.eventType.toLowerCase(), 'automated'];

    const ticketData: ZendeskTicketCreate = {
      subject,
      description: event.payload.message,
      priority: event.severity.toLowerCase(),
      tags
    };

    try {
      const response = await this.client.post('/tickets.json', {
        ticket: ticketData
      });

      const ticketId = response.data.ticket.id.toString();
      logEvent('zendesk_ticket_created', { ticketId, eventId: event.rowKey });
      logMetric('ticket_created', 1);

      return ticketId;
    } catch (error) {
      logger.error('Failed to create Zendesk ticket', { error, event });
      throw error;
    }
  }

  async updateTicket(ticketId: string, updates: ZendeskTicketUpdate): Promise<void> {
    try {
      await this.client.put(`/tickets/${ticketId}.json`, {
        ticket: updates
      });

      logEvent('zendesk_ticket_updated', { ticketId });
    } catch (error) {
      logger.error('Failed to update Zendesk ticket', { error, ticketId });
      throw error;
    }
  }

  async closeTicket(ticketId: string, resolution?: string): Promise<void> {
    const updates: ZendeskTicketUpdate = {
      status: TicketStatus.CLOSED
    };

    if (resolution) {
      updates.comment = resolution;
    }

    await this.updateTicket(ticketId, updates);
    logEvent('zendesk_ticket_closed', { ticketId });
  }

  async getTicket(ticketId: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.get(`/tickets/${ticketId}.json`);
      return response.data.ticket;
    } catch (error) {
      logger.error('Failed to get Zendesk ticket', { error, ticketId });
      throw error;
    }
  }

  async sendWebhook(ticketId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('Zendesk webhook URL not configured');
      return;
    }

    try {
      await axios.post(this.webhookUrl, {
        ticketId,
        eventType,
        payload,
        timestamp: new Date().toISOString()
      });

      logEvent('zendesk_webhook_sent', { ticketId, eventType });
    } catch (error) {
      logger.error('Failed to send Zendesk webhook', { error, ticketId });
      throw error;
    }
  }
}