// frontend/src/app/features/customization/price-calculator.spec.ts
import { calculatePrice, MATTE_FLAT_AMD, type PriceInputs } from './price-calculator';
import type { FrameOption, PrintSize } from '../../core/api-models/print-options.model';

const size: PrintSize = {
  id: 'p1',
  code: 'M',
  label: 'Medium',
  widthCm: 40,
  heightCm: 30,
  priceMultiplier: 1.5,
};

const frame: FrameOption = {
  id: 'f1',
  code: 'WOOD',
  label: 'Wood',
  frameType: 'WOOD',
  colorHex: '#6b4423',
  additionalPrice: 5000,
};

describe('calculatePrice', () => {
  it('uses multiplier 1 and no frame/matte when printSize and frameOption are null', () => {
    const input: PriceInputs = { artworkBasePrice: 10000, printSize: null, frameOption: null, withMatte: false };
    const result = calculatePrice(input);
    expect(result).toEqual({ unitPrice: 10000, baseLine: 10000, frameLine: 0, matteLine: 0 });
  });

  it('applies the print size multiplier to the base line', () => {
    const input: PriceInputs = { artworkBasePrice: 10000, printSize: size, frameOption: null, withMatte: false };
    const result = calculatePrice(input);
    expect(result.baseLine).toBe(15000);
    expect(result.unitPrice).toBe(15000);
  });

  it('adds the frame additional price', () => {
    const input: PriceInputs = { artworkBasePrice: 10000, printSize: null, frameOption: frame, withMatte: false };
    const result = calculatePrice(input);
    expect(result.frameLine).toBe(5000);
    expect(result.unitPrice).toBe(15000);
  });

  it('adds the flat matte fee when withMatte is true', () => {
    const input: PriceInputs = { artworkBasePrice: 10000, printSize: null, frameOption: null, withMatte: true };
    const result = calculatePrice(input);
    expect(result.matteLine).toBe(MATTE_FLAT_AMD);
    expect(result.unitPrice).toBe(10000 + MATTE_FLAT_AMD);
  });

  it('combines multiplier, frame, and matte and rounds the total', () => {
    const input: PriceInputs = {
      artworkBasePrice: 10000.4,
      printSize: size,
      frameOption: frame,
      withMatte: true,
    };
    const result = calculatePrice(input);
    // baseLine = 10000.4 * 1.5 = 15000.6, + 5000 frame + 3000 matte = 23000.6 -> rounds to 23001
    expect(result.baseLine).toBe(15001); // Math.round(15000.6)
    expect(result.unitPrice).toBe(23001);
  });

  it('rounds baseLine and unitPrice independently', () => {
    const input: PriceInputs = {
      artworkBasePrice: 100,
      printSize: { ...size, priceMultiplier: 1.005 },
      frameOption: null,
      withMatte: false,
    };
    const result = calculatePrice(input);
    expect(result.baseLine).toBe(Math.round(100 * 1.005));
    expect(result.unitPrice).toBe(result.baseLine);
  });
});
