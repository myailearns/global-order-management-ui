import {
  MediaPurposeRule,
  PREPARE_JPEG_QUALITY,
  PREPARE_MAX_PIXELS,
  PREPARE_RATIO_TOLERANCE,
  PREPARE_WEBP_QUALITY,
} from './media-purpose.config';

export type AdjustMode = 'fit' | 'fill' | 'crop';

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface FitLayout {
  canvasWidth: number;
  canvasHeight: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface ProcessedImage {
  file: File;
  width: number;
  height: number;
  size: number;
}

export class ImageProcessingError extends Error {
  constructor(readonly code: 'decode' | 'tooManyPixels' | 'encode') {
    super(code);
  }
}

export function ratioMatches(width: number, height: number, ratio: number, tolerance = PREPARE_RATIO_TOLERANCE): boolean {
  if (width <= 0 || height <= 0) return false;
  return Math.abs(width / height - ratio) / ratio <= tolerance;
}

export function isBelowMinimum(width: number, height: number, rule: MediaPurposeRule): boolean {
  return width < rule.minWidth || height < rule.minHeight;
}

/** Whole image kept; canvas padded to the target ratio. Never upscales. */
export function computeFitLayout(srcWidth: number, srcHeight: number, rule: MediaPurposeRule): FitLayout {
  const scale = Math.min(rule.outputWidth / srcWidth, rule.outputHeight / srcHeight, 1);
  const contentWidth = srcWidth * scale;
  const contentHeight = srcHeight * scale;
  const canvasWidth = Math.max(1, Math.round(Math.max(contentWidth, contentHeight * rule.ratio)));
  const canvasHeight = Math.max(1, Math.round(canvasWidth / rule.ratio));
  const dw = Math.round(contentWidth);
  const dh = Math.round(contentHeight);
  return {
    canvasWidth,
    canvasHeight,
    dx: Math.round((canvasWidth - dw) / 2),
    dy: Math.round((canvasHeight - dh) / 2),
    dw,
    dh,
  };
}

/** Largest centered rectangle of the given ratio inside the source. */
export function computeCenterCrop(srcWidth: number, srcHeight: number, ratio: number): CropRect {
  let sw = srcWidth;
  let sh = srcWidth / ratio;
  if (sh > srcHeight) {
    sh = srcHeight;
    sw = srcHeight * ratio;
  }
  return { sx: (srcWidth - sw) / 2, sy: (srcHeight - sh) / 2, sw, sh };
}

/** Output size for a crop: target size, reduced (never enlarged) when the crop is smaller. */
export function computeCropOutputSize(crop: CropRect, rule: MediaPurposeRule): ImageSize {
  const width = Math.max(1, Math.min(rule.outputWidth, Math.floor(crop.sw)));
  return { width, height: Math.max(1, Math.round(width / rule.ratio)) };
}

export function computeBaseScale(srcWidth: number, srcHeight: number, viewWidth: number, viewHeight: number): number {
  return Math.max(viewWidth / srcWidth, viewHeight / srcHeight);
}

export function clampOffset(offset: number, viewSize: number, scaledSize: number): number {
  return Math.min(0, Math.max(viewSize - scaledSize, offset));
}

/** Converts the interactive crop viewport state into a source-image rectangle. */
export function computeCropFromViewport(
  srcWidth: number,
  srcHeight: number,
  viewWidth: number,
  viewHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
): CropRect {
  const scale = computeBaseScale(srcWidth, srcHeight, viewWidth, viewHeight) * zoom;
  const sw = viewWidth / scale;
  const sh = viewHeight / scale;
  const sx = Math.min(srcWidth - sw, Math.max(0, -offsetX / scale));
  const sy = Math.min(srcHeight - sh, Math.max(0, -offsetY / scale));
  return { sx, sy, sw, sh };
}

export function readImageSize(file: File): Promise<ImageSize> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const size = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(size);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageProcessingError('decode'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}

async function encodeCanvas(canvas: HTMLCanvasElement): Promise<{ blob: Blob; extension: string }> {
  const webp = await canvasToBlob(canvas, 'image/webp', PREPARE_WEBP_QUALITY);
  if (webp && webp.type === 'image/webp') {
    return { blob: webp, extension: 'webp' };
  }
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', PREPARE_JPEG_QUALITY);
  if (jpeg && jpeg.type === 'image/jpeg') {
    return { blob: jpeg, extension: 'jpg' };
  }
  throw new ImageProcessingError('encode');
}

function outputFileName(source: File, extension: string): string {
  const base = source.name.replace(/\.[^/.]+$/, '') || 'image';
  return `${base}.${extension}`;
}

export async function processImage(
  file: File,
  rule: MediaPurposeRule,
  mode: AdjustMode,
  crop?: CropRect,
): Promise<ProcessedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageProcessingError('decode');
  }

  try {
    if (bitmap.width * bitmap.height > PREPARE_MAX_PIXELS) {
      throw new ImageProcessingError('tooManyPixels');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new ImageProcessingError('encode');
    context.imageSmoothingQuality = 'high';

    if (mode === 'fit') {
      const layout = computeFitLayout(bitmap.width, bitmap.height, rule);
      canvas.width = layout.canvasWidth;
      canvas.height = layout.canvasHeight;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, layout.dx, layout.dy, layout.dw, layout.dh);
    } else {
      const rect = mode === 'crop' && crop ? crop : computeCenterCrop(bitmap.width, bitmap.height, rule.ratio);
      const size = computeCropOutputSize(rect, rule);
      canvas.width = size.width;
      canvas.height = size.height;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, size.width, size.height);
    }

    const { blob, extension } = await encodeCanvas(canvas);
    const processed = new File([blob], outputFileName(file, extension), { type: blob.type });
    return { file: processed, width: canvas.width, height: canvas.height, size: processed.size };
  } finally {
    bitmap.close();
  }
}
