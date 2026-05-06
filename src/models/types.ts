import { EventType, DeviceType, Severity, AIAction } from './enums.js';

export interface DeviceEvent {
  partitionKey: string;
  rowKey: string;
  timestamp: string;
  eventType: EventType;
  deviceType: DeviceType;
  severity: Severity;
  payload: {
    alertCode?: string;
    message: string;
    metadata?: Record<string, unknown>;
  };
  _etag: string;
}

export interface TicketRecord {
  ticketId: string;
  eventId: string;
  deviceId: string;
  status: string;
  aiResult?: AIAgentResult;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface AIAgentResult {
  category: string;
  severity: Severity;
  recommendedAction: AIAction;
  confidence: number;
}

export interface RetryMeta {
  attemptNumber: number;
  nextRetryAt: string;
  lastError?: string;
}

export interface DeadLetterRecord extends RetryMeta {
  event: DeviceEvent;
  failedAt: string;
  maxRetriesExceeded: boolean;
}