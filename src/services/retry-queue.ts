import { TableClient } from '@azure/data-tables';
import { DeviceEvent, RetryMeta, DeadLetterRecord } from '../models/index.js';
import { logger, logEvent, logMetric } from '../utils/logger.js';

const MAX_RETRIES = 5;
const BACKOFF_BASE = 1000;

export class RetryQueue {
  private tableClient: TableClient | null = null;
  private readonly retryTableName = 'deviceretryqueue';

  constructor() {
    const connectionString = process.env.STORAGE_TABLE_CONNECTION_STRING;
    if (connectionString) {
      this.tableClient = TableClient.fromConnectionString(connectionString, this.retryTableName);
    }
  }

  calculateBackoff(attemptNumber: number): number {
    return Math.min(BACKOFF_BASE * Math.pow(2, attemptNumber - 1), 16000);
  }

  async enqueue(event: DeviceEvent, attemptNumber: number, lastError?: string): Promise<void> {
    if (!this.tableClient) {
      logger.warn('Table client not initialized, skipping retry enqueue');
      return;
    }

    const nextRetryAt = new Date(Date.now() + this.calculateBackoff(attemptNumber + 1)).toISOString();

    const retryMeta: RetryMeta = {
      attemptNumber: attemptNumber + 1,
      nextRetryAt,
      lastError
    };

    const entity = {
      partitionKey: event.partitionKey,
      rowKey: event.rowKey,
      eventType: event.eventType,
      deviceType: event.deviceType,
      severity: event.severity,
      payload: JSON.stringify(event.payload),
      timestamp: event.timestamp,
      attemptNumber: String(retryMeta.attemptNumber),
      nextRetryAt: retryMeta.nextRetryAt,
      lastError: retryMeta.lastError || ''
    };

    try {
      await this.tableClient.upsertEntity(entity);
      logEvent('retry_queue_enqueued', { eventId: event.rowKey, attemptNumber: String(retryMeta.attemptNumber) });
      logMetric('retry_enqueued', 1);
    } catch (error) {
      logger.error('Failed to enqueue retry', { error, event });
      throw error;
    }
  }

  async processRetry(event: DeviceEvent): Promise<boolean> {
    const attemptNumber = 1;

    try {
      await this.enqueue(event, attemptNumber);
      return true;
    } catch (error) {
      logger.error('Failed to process retry', { error, event });
      return false;
    }
  }

  async moveToDeadLetter(event: DeviceEvent, attemptNumber: number, lastError: string): Promise<void> {
    const deadLetterRecord: DeadLetterRecord = {
      event,
      attemptNumber,
      nextRetryAt: new Date().toISOString(),
      lastError,
      failedAt: new Date().toISOString(),
      maxRetriesExceeded: attemptNumber >= MAX_RETRIES
    };

    logger.error('Moving to dead letter queue', {
      eventId: event.rowKey,
      attemptNumber,
      maxRetriesExceeded: deadLetterRecord.maxRetriesExceeded
    });

    logEvent('dead_letter_created', { eventId: event.rowKey, attemptNumber: String(attemptNumber) });
    logMetric('dead_letter_count', 1);
  }

  async getRetryCount(eventId: string): Promise<number> {
    if (!this.tableClient) return 0;

    try {
      const entity = await this.tableClient.getEntity('default', eventId);
      return parseInt(entity.attemptNumber as string, 10) || 0;
    } catch {
      return 0;
    }
  }

  async shouldRetry(eventId: string): Promise<boolean> {
    const count = await this.getRetryCount(eventId);
    return count < MAX_RETRIES;
  }
}