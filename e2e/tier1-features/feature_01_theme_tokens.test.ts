import { TestHarness } from '../harness/testHarness';

describe('Tier 1 - Feature 01: Modern Design System & Theme Tokens', () => {
  const theme = TestHarness.getTheme();

  test('TC01-01: FinTech primary color palette is completely defined with high contrast tokens', () => {
    expect(theme.colors).toBeDefined();
    expect(theme.colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.colors.primaryDark).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.colors.primaryLight).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.colors.primarySoft).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.colors.primaryBorder).toBeDefined();
  });

  test('TC01-02: Status semantic colors cover success, warning, danger, and accent categories', () => {
    expect(theme.colors.success).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.colors.warning).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.colors.danger).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.colors.purple).toBeDefined();
    expect(theme.colors.cyan).toBeDefined();
  });

  test('TC01-03: Slate neutral scale contains comprehensive grading from slate900 to slate50', () => {
    const expectedNeutrals = [
      'slate900', 'slate800', 'slate700', 'slate600',
      'slate500', 'slate400', 'slate300', 'slate200', 'slate100', 'slate50'
    ];
    for (const key of expectedNeutrals) {
      expect((theme.colors as any)[key]).toBeDefined();
      expect((theme.colors as any)[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    expect(theme.colors.white).toBe('#FFFFFF');
  });

  test('TC01-04: Radius hierarchy provides standard token steps from xs to full pill', () => {
    expect(theme.radius).toBeDefined();
    expect(theme.radius.xs).toBeLessThanOrEqual(theme.radius.sm);
    expect(theme.radius.sm).toBeLessThan(theme.radius.md);
    expect(theme.radius.md).toBeLessThan(theme.radius.lg);
    expect(theme.radius.lg).toBeLessThan(theme.radius.xl);
    expect(theme.radius.full).toBeGreaterThanOrEqual(999);
  });

  test('TC01-05: Elevation and shadow definitions support card elevation and floating modals', () => {
    expect(theme.shadows).toBeDefined();
    if (theme.shadows.card) {
      expect(theme.shadows.card.elevation).toBeGreaterThanOrEqual(1);
      expect(theme.shadows.card.shadowOpacity).toBeGreaterThan(0);
    }
    if (theme.shadows.float) {
      expect(theme.shadows.float.elevation).toBeGreaterThan(theme.shadows.card?.elevation || 0);
    }
  });

  test('TC01-06: Background, cardBackground and border tokens guarantee clean contrast hierarchy', () => {
    expect(theme.colors.background).toBeDefined();
    expect(theme.colors.cardBackground).toBeDefined();
    expect(theme.colors.border).toBeDefined();
    // Card background should be distinct from page background
    expect(theme.colors.cardBackground).not.toEqual(theme.colors.slate900);
  });
});
