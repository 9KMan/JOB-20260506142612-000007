import { TicketAI } from '../src/services/ticket-ai';
import { DeviceEvent, EventType, DeviceType, Severity } from '../src/models';

describe('TicketAI', () => {
  let ticketAI: TicketAI;

  beforeEach(() => {
    ticketAI = new TicketAI();
  });

  describe('analyze', () => {
    it('should auto-resolve Starlink offline events', async () => {
      const event: DeviceEvent = {
        partitionKey: 'device-123',
        rowKey: 'event-456',
        timestamp: new Date().toISOString(),
        eventType: EventType.DEVICE_OFFLINE,
        deviceType: DeviceType.STARLINK,
        severity: Severity.HIGH,
        payload: {
          message: 'Device is offline - Starlink outage reported'
        },
        _etag: 'etag-1'
      };

      const result = await ticketAI.analyze(event);

      expect(result.category).toBe('known_outage');
      expect(result.recommendedAction).toBe('resolve');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should escalate Cradlepoint offline events', async () => {
      const event: DeviceEvent = {
        partitionKey: 'device-123',
        rowKey: 'event-456',
        timestamp: new Date().toISOString(),
        eventType: EventType.DEVICE_OFFLINE,
        deviceType: DeviceType.CRADLEPOINT,
        severity: Severity.HIGH,
        payload: {
          message: 'Device is offline - cellular failover may be needed'
        },
        _etag: 'etag-1'
      };

      const result = await ticketAI.analyze(event);

      expect(result.category).toBe('cellular_failover_needed');
      expect(result.recommendedAction).toBe('escalate');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should auto-resolve manual sync events', async () => {
      const event: DeviceEvent = {
        partitionKey: 'device-123',
        rowKey: 'event-456',
        timestamp: new Date().toISOString(),
        eventType: EventType.MANUAL_SYNC,
        deviceType: DeviceType.PEPLINK,
        severity: Severity.LOW,
        payload: {
          message: 'Routine status check completed'
        },
        _etag: 'etag-1'
      };

      const result = await ticketAI.analyze(event);

      expect(result.recommendedAction).toBe('resolve');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });
});