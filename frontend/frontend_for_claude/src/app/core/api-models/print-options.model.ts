// frontend/src/app/core/api-models/print-options.model.ts
/** Public-facing print size (active only, locale-aware label). */
export interface PrintSize {
  id: string;
  code: string;
  label: string;
  widthCm: number;
  heightCm: number;
  priceMultiplier: number;
}

export type FrameType = 'NONE' | 'WOOD' | 'METAL' | 'PLASTIC';

/** Public-facing frame option. */
export interface FrameOption {
  id: string;
  code: string;
  label: string;
  frameType: FrameType;
  colorHex: string;
  additionalPrice: number;
}
