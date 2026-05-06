import { EventType, DeviceType, Severity, AIAction } from '../src/models/enums';

describe('Models', () => {
  describe('EventType', () => {
    it('should have all event types defined', () => {
      expect(EventType.DEVICE_ALERT).toBe('DEVICE_ALERT');
      expect(EventType.DEVICE_OFFLINE).toBe('DEVICE_OFFLINE');
      expect(EventType.DEVICE_CONFIG).toBe('DEVICE_CONFIG');
      expect(EventType.MANUAL_SYNC).toBe('MANUAL_SYNC');
    });
  });

  describe('DeviceType', () => {
    it('should have all device types defined', () => {
      expect(DeviceType.CRADLEPOINT).toBe('Cradlepoint');
      expect(DeviceType.PEPLINK).toBe('Peplink');
      expect(DeviceType.STARLINK).toBe('Starlink');
    });
  });

  describe('Severity', () => {
    it('should have all severity levels defined', () => {
      expect(Severity.CRITICAL).toBe('Critical');
      expect(Severity.HIGH).toBe('High');
      expect(Severity.MEDIUM).toBe('Medium');
      expect(Severity.LOW).toBe('Low');
    });
  });

  describe('AIAction', () => {
    it('should have all AI actions defined', () => {
      expect(AIAction.RESOLVE).toBe('resolve');
      expect(AIAction.ESCALATE).toBe('escalate');
      expect(AIAction.WAIT).toBe('wait');
    });
  });
});