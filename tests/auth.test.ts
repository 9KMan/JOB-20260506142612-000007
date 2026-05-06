import { AuthManager } from '../src/services/auth';

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    authManager = new AuthManager();
  });

  describe('getPeplinkKey', () => {
    it('should return null when no API key is set', () => {
      const key = authManager.getPeplinkKey();
      expect(key).toBeNull();
    });
  });

  describe('getStarlinkKey', () => {
    it('should return null when no API key is set', () => {
      const key = authManager.getStarlinkKey();
      expect(key).toBeNull();
    });
  });
});