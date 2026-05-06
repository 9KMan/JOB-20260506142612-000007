import OpenAI from 'openai';
import { DeviceEvent, Severity, AIAction, AIAgentResult, DeviceType } from '../models/index.js';
import { logger } from '../utils/logger.js';

export class TicketAI {
  private openai: OpenAI | null = null;
  private readonly useRulesFallback: boolean = true;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async analyze(event: DeviceEvent): Promise<AIAgentResult> {
    if (this.useRulesFallback) {
      const rulesResult = this.applyRulesEngine(event);
      if (rulesResult) {
        logger.info('AI analysis - rules engine match', { eventId: event.rowKey, result: rulesResult });
        return rulesResult;
      }
    }

    if (this.openai) {
      try {
        return await this.analyzeWithLLM(event);
      } catch (error) {
        logger.warn('LLM analysis failed, falling back to rules engine', { error, eventId: event.rowKey });
        return this.applyRulesEngine(event) || this.defaultResult();
      }
    }

    return this.applyRulesEngine(event) || this.defaultResult();
  }

  private async analyzeWithLLM(event: DeviceEvent): Promise<AIAgentResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const prompt = `Analyze this device ticket:
Device Type: ${event.deviceType}
Event Type: ${event.eventType}
Severity: ${event.severity}
Alert Code: ${event.payload.alertCode || 'N/A'}
Message: ${event.payload.message}

Respond with JSON: { "category": string, "severity": "Critical"|"High"|"Medium"|"Low", "action": "resolve"|"escalate"|"wait", "confidence": 0-1 }`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    const parsed = JSON.parse(content) as { category: string; severity: Severity; action: AIAction; confidence: number };
    return {
      category: parsed.category,
      severity: parsed.severity,
      recommendedAction: parsed.action,
      confidence: parsed.confidence
    };
  }

  private applyRulesEngine(event: DeviceEvent): AIAgentResult | null {
    const message = event.payload.message.toLowerCase();
    const deviceType = event.deviceType;
    const alertCode = event.payload.alertCode?.toLowerCase() || '';

    if (message.includes('offline') && deviceType === DeviceType.STARLINK) {
      return {
        category: 'known_outage',
        severity: event.severity,
        recommendedAction: AIAction.RESOLVE,
        confidence: 0.95
      };
    }

    if (message.includes('offline') && deviceType === DeviceType.CRADLEPOINT) {
      return {
        category: 'cellular_failover_needed',
        severity: Severity.HIGH,
        recommendedAction: AIAction.ESCALATE,
        confidence: 0.85
      };
    }

    if (message.includes('error') && alertCode) {
      return {
        category: 'device_error',
        severity: event.severity,
        recommendedAction: AIAction.ESCALATE,
        confidence: 0.6
      };
    }

    if (event.eventType === 'MANUAL_SYNC') {
      return {
        category: 'routine_status',
        severity: Severity.LOW,
        recommendedAction: AIAction.RESOLVE,
        confidence: 0.95
      };
    }

    if (message.includes('routine') || message.includes('status')) {
      return {
        category: 'routine_check',
        severity: Severity.LOW,
        recommendedAction: AIAction.RESOLVE,
        confidence: 0.9
      };
    }

    return null;
  }

  private defaultResult(): AIAgentResult {
    return {
      category: 'unknown',
      severity: Severity.MEDIUM,
      recommendedAction: AIAction.WAIT,
      confidence: 0.5
    };
  }

  async resolve(_ticketId: string, _action: AIAction, _resolution?: string): Promise<void> {
    logger.info('Ticket AI resolution', { ticketId: _ticketId, action: _action, resolution: _resolution || '' });
  }

  async escalate(_ticketId: string, _reason: string): Promise<void> {
    logger.info('Ticket escalated', { ticketId: _ticketId, reason: _reason });
  }
}