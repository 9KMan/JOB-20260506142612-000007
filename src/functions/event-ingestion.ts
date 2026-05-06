import { DeviceEvent } from '../models/index.js';
import { logger, logEvent, logMetric } from '../utils/logger.js';
import { RetryQueue } from '../services/retry-queue.js';

export function generateIdempotencyKey(partitionKey: string, rowKey: string, eventType: string): string {
  return `${partitionKey}:${rowKey}:${eventType}`;
}

export function isValidEventPayload(body: unknown): body is DeviceEvent {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return !!(b.partitionKey && b.rowKey && b.timestamp && b.eventType && b.deviceType && b.severity && b.payload);
}

export async function handleEventIngestion(request: { json: () => Promise<unknown> }): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const retryQueue = new RetryQueue();

  try {
    const body = await request.json() as unknown;

    if (!isValidEventPayload(body)) {
      const invalidEvent = body as DeviceEvent;
      logger.warn('Invalid event payload received', { body });
      if (invalidEvent && invalidEvent.partitionKey) {
        await retryQueue.moveToDeadLetter(
          invalidEvent,
          0,
          'Validation failed: missing required fields'
        );
      }
      return { status: 400, body: { error: 'Invalid payload: missing required fields' } };
    }

    const event = body as DeviceEvent;
    const idempotencyKey = generateIdempotencyKey(
      event.partitionKey,
      event.rowKey,
      event.eventType
    );

    logger.info('Event received', {
      idempotencyKey,
      eventType: event.eventType,
      deviceType: event.deviceType
    });

    logEvent('event_ingested', {
      idempotencyKey,
      eventType: event.eventType,
      deviceType: event.deviceType
    });
    logMetric('event_received', 1);

    return {
      status: 202,
      body: {
        status: 'accepted',
        idempotencyKey,
        eventId: event.rowKey
      }
    };
  } catch (error) {
    logger.error('Event ingestion failed', { error });

    const body = await request.json().catch(() => ({}));
    const event = body as DeviceEvent;
    if (event && event.partitionKey) {
      await retryQueue.processRetry(event);
    }

    return { status: 500, body: { error: 'Internal server error' } };
  }
}

export async function handleEventGridEvent(event: Record<string, unknown>): Promise<void> {
  try {
    const body = event.data as unknown;

    if (!isValidEventPayload(body)) {
      logger.warn('Invalid Event Grid payload', { body });
      return;
    }

    const deviceEvent = body as DeviceEvent;
    const idempotencyKey = generateIdempotencyKey(
      deviceEvent.partitionKey,
      deviceEvent.rowKey,
      deviceEvent.eventType
    );

    logger.info('Event Grid event processed', { idempotencyKey });
    logEvent('eventgrid_processed', { idempotencyKey });
  } catch (error) {
    logger.error('Event Grid handler failed', { error });
  }
}