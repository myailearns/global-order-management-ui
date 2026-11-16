export type MediaPurpose = 'PRODUCT' | 'CATEGORY' | 'PACK';

export interface MediaPurposeRule {
  purpose: MediaPurpose;
  ratio: number;
  ratioLabel: string;
  outputWidth: number;
  outputHeight: number;
  minWidth: number;
  minHeight: number;
}

export const MEDIA_PURPOSE_RULES: Record<MediaPurpose, MediaPurposeRule> = {
  PRODUCT: { purpose: 'PRODUCT', ratio: 1, ratioLabel: '1:1', outputWidth: 1200, outputHeight: 1200, minWidth: 800, minHeight: 800 },
  CATEGORY: { purpose: 'CATEGORY', ratio: 1, ratioLabel: '1:1', outputWidth: 600, outputHeight: 600, minWidth: 400, minHeight: 400 },
  PACK: { purpose: 'PACK', ratio: 4 / 3, ratioLabel: '4:3', outputWidth: 1200, outputHeight: 900, minWidth: 800, minHeight: 600 },
};

export const MEDIA_PURPOSES: MediaPurpose[] = ['PRODUCT', 'CATEGORY', 'PACK'];

export const PREPARE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PREPARE_SOURCE_MAX_MB = 20;
export const PREPARE_SOURCE_MAX_BYTES = PREPARE_SOURCE_MAX_MB * 1024 * 1024;
export const PREPARE_OUTPUT_MAX_BYTES = 5 * 1024 * 1024;
export const PREPARE_MAX_PIXELS = 50_000_000;
export const PREPARE_RATIO_TOLERANCE = 0.02;
export const PREPARE_WEBP_QUALITY = 0.85;
export const PREPARE_JPEG_QUALITY = 0.88;
