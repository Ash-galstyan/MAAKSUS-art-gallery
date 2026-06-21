// frontend/src/app/features/wall-preview/frame-styles.ts
/**
 * Frame presets. Used by both the wall-preview renderer (canvas) and the
 * customization page (Phase 8). Frame thickness is expressed as a fraction
 * of the SHORTER side of the framed artwork — so frames scale visually with
 * artwork size instead of being absolute pixel widths.
 *
 * Each style includes a `mattePadFraction` for how thick the matte (white
 * border between art and frame) is when enabled.
 */
export type FrameStyleId = 'none' | 'wood' | 'metal' | 'plastic';

export interface FrameStyle {
  id: FrameStyleId;
  /** Label key looked up via i18n in the UI. */
  labelKey: string;
  /** Frame thickness as a fraction of the shorter side of the framed area. */
  thicknessFraction: number;
  /** Matte (mount) thickness as a fraction of the shorter side. */
  mattePadFraction: number;
  /**
   * Default colour — overridable from the UI via FrameConfig.colorHex.
   * Picked to look reasonable on a typical wall photo.
   */
  defaultColorHex: string;
  /**
   * Rendering hint — adds a subtle bevel/gradient appropriate to the material.
   * Pure visual; doesn't affect dimensions.
   */
  finish: 'flat' | 'wood' | 'metal';
}

export const FRAME_STYLES: Record<FrameStyleId, FrameStyle> = {
  none: {
    id: 'none',
    labelKey: 'wallPreview.frame.none',
    thicknessFraction: 0,
    mattePadFraction: 0,
    defaultColorHex: '#000000',
    finish: 'flat',
  },
  wood: {
    id: 'wood',
    labelKey: 'wallPreview.frame.wood',
    thicknessFraction: 0.06,
    mattePadFraction: 0.04,
    defaultColorHex: '#6b4423',
    finish: 'wood',
  },
  metal: {
    id: 'metal',
    labelKey: 'wallPreview.frame.metal',
    thicknessFraction: 0.035,
    mattePadFraction: 0.04,
    defaultColorHex: '#2b2b2b',
    finish: 'metal',
  },
  plastic: {
    id: 'plastic',
    labelKey: 'wallPreview.frame.plastic',
    thicknessFraction: 0.045,
    mattePadFraction: 0.03,
    defaultColorHex: '#ffffff',
    finish: 'flat',
  },
};

export const FRAME_COLOR_SWATCHES = [
  '#000000', // black
  '#ffffff', // white
  '#6b4423', // walnut
  '#a87148', // oak
  '#c9a06a', // light pine
  '#b8b8b8', // brushed silver
  '#c9b37a', // brass
];
