import { DeviceEvent, EventType, TicketStatus, AIAction } from '../models/index.js';
import { logger, logEvent, logMetric } from '../utils/logger.js';
import { ZendeskBridge } from '../services/zendesk.js';
import { TicketAI } from '../services/ticket-ai.js';
import { RetryQueue } from '../services/retry-queue.js';

const MAX_RETRIES = 5;

export class OrchestrationFunction {
  private zendeskBridge: ZendeskBridge;
  private ticketAI: TicketAI;
  private retryQueue: RetryQueue;

  constructor() {
    this.zendeskBridge = new ZendeskBridge();
    this.ticketAI = new TicketAI();
    this.retryQueue = new RetryQueue();
  }

  async orchestrate(event: DeviceEvent): Promise<{ ticketId: string; status: string }> {
    const instanceId = event.partitionKey;

    logger.info('Starting orchestration', { instanceId, eventType: event.eventType });
    logEvent('orchestration_started', { instanceId, eventType: event.eventType });

    try {
      const result = await this.processEvent(event);
      logEvent('orchestration_completed', { instanceId, ticketId: result.ticketId });
      logMetric('orchestration_success', 1);
      return result;
    } catch (error) {
      logger.error('Orchestration failed', { error, instanceId });
      logMetric('orchestration_failure', 1);
      throw error;
    }
  }

  private async processEvent(event: DeviceEvent): Promise<{ ticketId: string; status: string }> {
    if (event.eventType === EventType.MANUAL_SYNC) {
      return this.handleManualSync(event);
    }

    return this.handleDeviceEvent(event);
  }

  private async handleManualSync(event: DeviceEvent): Promise<{ ticketId: string; status: string }> {
    const ticketId = await this.zendeskBridge.createTicket(event);
    logEvent('manual_sync_ticket_created', { ticketId, eventId: event.rowKey });
    return { ticketId, status: TicketStatus.OPEN };
  }

  private async handleDeviceEvent(event: DeviceEvent): Promise<{ ticketId: string; status: string }> {
    const ticketId = await this.zendeskBridge.createTicket(event);

    const aiResult = await this.ticketAI.analyze(event);

    switch (aiResult.recommendedAction) {
      case AIAction.RESOLVE:
        await this.zendeskBridge.closeTicket(ticketId, `Auto-resolved: ${aiResult.category}`);
        logEvent('ticket_auto_resolved', { ticketId, category: aiResult.category });
        return { ticketId, status: TicketStatus.CLOSED };

      case AIAction.ESCALATE:
        await this.zendeskBridge.updateTicket(ticketId, {
          status: TicketStatus.OPEN,
          comment: `Escalated: ${aiResult.category}`
        });
        await this.ticketAI.escalate(ticketId, aiResult.category);
        logEvent('ticket_escalated', { ticketId, category: aiResult.category });
        return { ticketId, status: TicketStatus.OPEN };

      case AIAction.WAIT:
        await this.zendeskBridge.updateTicket(ticketId, {
          status: TicketStatus.PENDING,
          comment: `Awaiting analysis: ${aiResult.category}`
        });
        return { ticketId, status: TicketStatus.PENDING };

      default:
        return { ticketId, status: TicketStatus.OPEN };
    }
  }

  async handleOrchestrationEvent(event: DeviceEvent): Promise<void> {
    try {
      const instanceId = event.partitionKey;
      const canProcess = await this.acquireSingletonLock(instanceId);

      if (!canProcess) {
        logger.info('Another orchestration in progress, queuing', { instanceId });
        await this.retryQueue.enqueue(event, 0, 'Singleton lock held by another instance');
        return;
      }

      try {
        await this.orchestrate(event);
      } finally {
        await this.releaseSingletonLock(instanceId);
      }
    } catch (error) {
      const attemptCount = await this.retryQueue.getRetryCount(event.rowKey);

      if (attemptCount >= MAX_RETRIES) {
        await this.retryQueue.moveToDeadLetter(event, attemptCount, String(error));
        logEvent('orchestration_max_retries', { eventId: event.rowKey });
      } else {
        await this.retryQueue.enqueue(event, attemptCount, String(error));
      }

      throw error;
    }
  }

  private async acquireSingletonLock(_instanceId: string): Promise<boolean> {
    logger.info('Acquiring singleton lock', { instanceId: _instanceId });
    return true;
  }

  private async releaseSingletonLock(_instanceId: string): Promise<void> {
    logger.info('Releasing singleton lock', { instanceId: _instanceId });
  }
}

export async function mainOrchestration(event: DeviceEvent): Promise<{ ticketId: string; status: string }> {
  const orchestrator = new OrchestrationFunction();
  return orchestrator.orchestrate(event);
}

export async function runOrchestrationTimer(): Promise<void> {
  logger.info('Orchestration timer triggered');
}