// frontend/src/app/features/wall-preview/frame-styles.spec.ts
import { FRAME_STYLES, FRAME_COLOR_SWATCHES, type FrameStyleId } from './frame-styles';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

describe('FRAME_STYLES', () => {
  it('has an entry for every FrameStyleId, keyed by its own id', () => {
    const ids: FrameStyleId[] = ['none', 'wood', 'metal', 'plastic'];
    for (const id of ids) {
      expect(FRAME_STYLES[id].id).toBe(id);
    }
    expect(Object.keys(FRAME_STYLES).sort()).toEqual([...ids].sort());
  });

  it('gives "none" zero thickness and matte padding', () => {
    expect(FRAME_STYLES.none.thicknessFraction).toBe(0);
    expect(FRAME_STYLES.none.mattePadFraction).toBe(0);
  });

  it('gives every non-none style a positive thickness fraction', () => {
    for (const id of ['wood', 'metal', 'plastic'] as const) {
      expect(FRAME_STYLES[id].thicknessFraction).toBeGreaterThan(0);
    }
  });

  it('keeps thickness and matte fractions within a sane visual range', () => {
    for (const style of Object.values(FRAME_STYLES)) {
      expect(style.thicknessFraction).toBeGreaterThanOrEqual(0);
      expect(style.thicknessFraction).toBeLessThan(0.25);
      expect(style.mattePadFraction).toBeGreaterThanOrEqual(0);
      expect(style.mattePadFraction).toBeLessThan(0.25);
    }
  });

  it('uses well-formed hex colors for every default color', () => {
    for (const style of Object.values(FRAME_STYLES)) {
      expect(style.defaultColorHex).toMatch(HEX_RE);
    }
  });

  it('uses a non-empty i18n label key for every style', () => {
    for (const style of Object.values(FRAME_STYLES)) {
      expect(style.labelKey).toMatch(/^wallPreview\.frame\./);
    }
  });

  it('assigns a valid finish to every style', () => {
    const validFinishes = new Set(['flat', 'wood', 'metal']);
    for (const style of Object.values(FRAME_STYLES)) {
      expect(validFinishes.has(style.finish)).toBeTrue();
    }
  });
});

describe('FRAME_COLOR_SWATCHES', () => {
  it('is a non-empty list of well-formed, unique hex colors', () => {
    expect(FRAME_COLOR_SWATCHES.length).toBeGreaterThan(0);
    for (const hex of FRAME_COLOR_SWATCHES) {
      expect(hex).toMatch(HEX_RE);
    }
    expect(new Set(FRAME_COLOR_SWATCHES).size).toBe(FRAME_COLOR_SWATCHES.length);
  });
});
