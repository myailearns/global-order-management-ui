export const OFFER_STACKING_MODES = {
  BEST_ONLY: 'BEST_ONLY',
  ONE_PER_TYPE: 'ONE_PER_TYPE',
  ALL: 'ALL',
} as const;

export type OfferStackingMode = typeof OFFER_STACKING_MODES[keyof typeof OFFER_STACKING_MODES];

export const DEFAULT_OFFER_STACKING_MODE: OfferStackingMode = OFFER_STACKING_MODES.ONE_PER_TYPE;
