import {
  clampOffset,
  computeBaseScale,
  computeCenterCrop,
  computeCropFromViewport,
  computeCropOutputSize,
  computeFitLayout,
  isBelowMinimum,
  ratioMatches,
} from './image-processor.util';
import { MEDIA_PURPOSE_RULES } from './media-purpose.config';

describe('image-processor.util', () => {
  const product = MEDIA_PURPOSE_RULES.PRODUCT;
  const pack = MEDIA_PURPOSE_RULES.PACK;

  describe('ratioMatches', () => {
    it('accepts exact and near ratios within 2%', () => {
      expect(ratioMatches(1000, 1000, 1)).toBeTrue();
      expect(ratioMatches(1010, 1000, 1)).toBeTrue();
      expect(ratioMatches(1200, 900, 4 / 3)).toBeTrue();
    });

    it('rejects ratios outside tolerance', () => {
      expect(ratioMatches(1100, 1000, 1)).toBeFalse();
      expect(ratioMatches(1600, 900, 4 / 3)).toBeFalse();
    });

    it('rejects invalid dimensions', () => {
      expect(ratioMatches(0, 100, 1)).toBeFalse();
      expect(ratioMatches(100, 0, 1)).toBeFalse();
    });
  });

  describe('isBelowMinimum', () => {
    it('flags images smaller than the purpose minimum', () => {
      expect(isBelowMinimum(799, 1000, product)).toBeTrue();
      expect(isBelowMinimum(1000, 799, product)).toBeTrue();
      expect(isBelowMinimum(800, 800, product)).toBeFalse();
      expect(isBelowMinimum(800, 600, pack)).toBeFalse();
    });
  });

  describe('computeFitLayout', () => {
    it('pads a landscape image to a square canvas, centered', () => {
      const layout = computeFitLayout(2000, 1000, product);
      expect(layout.canvasWidth).toBe(1200);
      expect(layout.canvasHeight).toBe(1200);
      expect(layout.dw).toBe(1200);
      expect(layout.dh).toBe(600);
      expect(layout.dx).toBe(0);
      expect(layout.dy).toBe(300);
    });

    it('pads a portrait image to a square canvas, centered', () => {
      const layout = computeFitLayout(1000, 2000, product);
      expect(layout.canvasWidth).toBe(1200);
      expect(layout.canvasHeight).toBe(1200);
      expect(layout.dw).toBe(600);
      expect(layout.dh).toBe(1200);
      expect(layout.dx).toBe(300);
      expect(layout.dy).toBe(0);
    });

    it('never upscales small images', () => {
      const layout = computeFitLayout(400, 200, product);
      expect(layout.dw).toBe(400);
      expect(layout.dh).toBe(200);
      expect(layout.canvasWidth).toBe(400);
      expect(layout.canvasHeight).toBe(400);
    });

    it('keeps the 4:3 canvas ratio for packs', () => {
      const layout = computeFitLayout(3000, 1000, pack);
      expect(layout.canvasWidth).toBe(1200);
      expect(layout.canvasHeight).toBe(900);
    });
  });

  describe('computeCenterCrop', () => {
    it('crops a landscape image to a centered square', () => {
      const crop = computeCenterCrop(2000, 1000, 1);
      expect(crop).toEqual({ sx: 500, sy: 0, sw: 1000, sh: 1000 });
    });

    it('crops a portrait image to a centered square', () => {
      const crop = computeCenterCrop(1000, 2000, 1);
      expect(crop).toEqual({ sx: 0, sy: 500, sw: 1000, sh: 1000 });
    });

    it('crops to 4:3 inside a wider source', () => {
      const crop = computeCenterCrop(2000, 1000, 4 / 3);
      expect(crop.sh).toBe(1000);
      expect(crop.sw).toBeCloseTo(1333.33, 1);
      expect(crop.sx).toBeCloseTo(333.33, 1);
    });
  });

  describe('computeCropOutputSize', () => {
    it('caps at the purpose output size', () => {
      expect(computeCropOutputSize({ sx: 0, sy: 0, sw: 3000, sh: 3000 }, product)).toEqual({ width: 1200, height: 1200 });
    });

    it('does not enlarge small crops', () => {
      expect(computeCropOutputSize({ sx: 0, sy: 0, sw: 600, sh: 600 }, product)).toEqual({ width: 600, height: 600 });
    });

    it('keeps the target ratio for packs', () => {
      expect(computeCropOutputSize({ sx: 0, sy: 0, sw: 2000, sh: 1500 }, pack)).toEqual({ width: 1200, height: 900 });
    });
  });

  describe('crop viewport helpers', () => {
    it('computes a cover scale for the viewport', () => {
      expect(computeBaseScale(2000, 1000, 280, 280)).toBeCloseTo(0.28, 5);
    });

    it('clamps offsets so the image always covers the viewport', () => {
      expect(clampOffset(10, 280, 560)).toBe(0);
      expect(clampOffset(-500, 280, 560)).toBe(-280);
      expect(clampOffset(-100, 280, 560)).toBe(-100);
    });

    it('maps the viewport back to a source rectangle', () => {
      const crop = computeCropFromViewport(2000, 1000, 280, 280, 1, 0, 0);
      expect(crop.sx).toBe(0);
      expect(crop.sy).toBe(0);
      expect(crop.sw).toBeCloseTo(1000, 3);
      expect(crop.sh).toBeCloseTo(1000, 3);
    });

    it('keeps the rectangle inside the source when zoomed and panned', () => {
      const crop = computeCropFromViewport(2000, 1000, 280, 280, 2, -10000, -10000);
      expect(crop.sx + crop.sw).toBeLessThanOrEqual(2000.0001);
      expect(crop.sy + crop.sh).toBeLessThanOrEqual(1000.0001);
      expect(crop.sw).toBeCloseTo(500, 3);
    });
  });
});
