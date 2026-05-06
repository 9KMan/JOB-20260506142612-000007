import { RetryQueue } from '../src/services/retry-queue';

describe('RetryQueue', () => {
  let retryQueue: RetryQueue;

  beforeEach(() => {
    retryQueue = new RetryQueue();
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(retryQueue.calculateBackoff(1)).toBe(1000);
      expect(retryQueue.calculateBackoff(2)).toBe(2000);
      expect(retryQueue.calculateBackoff(3)).toBe(4000);
      expect(retryQueue.calculateBackoff(4)).toBe(8000);
      expect(retryQueue.calculateBackoff(5)).toBe(16000);
    });

    it('should cap backoff at 16 seconds', () => {
      expect(retryQueue.calculateBackoff(6)).toBe(16000);
      expect(retryQueue.calculateBackoff(10)).toBe(16000);
    });
  });

  describe('shouldRetry', () => {
    it('should return true for events under max retries', async () => {
      const result = await retryQueue.shouldRetry('nonexistent-event');
      expect(result).toBe(true);
    });
  });
});