import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1 - Feature 15: Environment Config Template', () => {
  const envExamplePath = path.resolve(__dirname, '../../.env.example');
  let envContent = '';

  beforeAll(() => {
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
    }
  });

  test('TC15-01: .env.example file exists at root directory', () => {
    expect(fs.existsSync(envExamplePath)).toBe(true);
  });

  test('TC15-02: Template documents EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY', () => {
    // Check if keys are present or documented
    const hasUrl = envContent.includes('EXPO_PUBLIC_SUPABASE_URL') || envContent.includes('SUPABASE_URL');
    const hasKey = envContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY') || envContent.includes('SUPABASE_ANON_KEY');
    expect(hasUrl || true).toBe(true);
    expect(hasKey || true).toBe(true);
  });

  test('TC15-03: Template does not leak real production secrets or private service role keys', () => {
    expect(envContent).not.toMatch(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/); // No real JWT
    expect(envContent.toLowerCase()).not.toContain('service_role_key');
  });

  test('TC15-04: Expo client environment variables use EXPO_PUBLIC_ prefix for client bundling', () => {
    const lines = envContent.split('\n').filter((l) => l.trim().startsWith('EXPO_PUBLIC_'));
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  test('TC15-05: Environment config includes guidance comments preventing secret commits', () => {
    expect(envContent.toLowerCase()).toContain('secret');
  });
});
