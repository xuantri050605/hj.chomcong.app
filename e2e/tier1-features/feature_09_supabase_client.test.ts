import { MockUniversalStorage } from '../harness/testHarness';

describe('Tier 1 - Feature 09: Supabase Client & Universal Storage', () => {
  let storage: MockUniversalStorage;

  beforeEach(() => {
    storage = new MockUniversalStorage();
  });

  test('TC09-01: UniversalStorage stores and retrieves string items accurately', async () => {
    await storage.setItem('test_key', 'test_value');
    const val = await storage.getItem('test_key');
    expect(val).toBe('test_value');
  });

  test('TC09-02: Non-existent key returns null without throwing errors', async () => {
    const val = await storage.getItem('non_existent_key');
    expect(val).toBeNull();
  });

  test('TC09-03: Removing an item deletes it from the storage registry', async () => {
    await storage.setItem('to_delete', 'value123');
    await storage.removeItem('to_delete');
    const val = await storage.getItem('to_delete');
    expect(val).toBeNull();
  });

  test('TC09-04: Storage clear wipes all registered keys completely', async () => {
    await storage.setItem('k1', 'v1');
    await storage.setItem('k2', 'v2');
    expect(storage.getAllKeys().length).toBe(2);

    await storage.clear();
    expect(storage.getAllKeys().length).toBe(0);
  });

  test('TC09-05: Serialization of complex JSON objects persists and parses without corruption', async () => {
    const sessionPayload = {
      token: 'jwt_mock_token_xyz',
      user: { id: 'usr_1', email: 'test@example.com' },
      expiresAt: 1762500000000,
    };
    await storage.setItem('sb-session', JSON.stringify(sessionPayload));

    const retrieved = await storage.getItem('sb-session');
    expect(retrieved).not.toBeNull();
    const parsed = JSON.parse(retrieved!);
    expect(parsed.token).toBe(sessionPayload.token);
    expect(parsed.user.email).toBe(sessionPayload.user.email);
  });
});
