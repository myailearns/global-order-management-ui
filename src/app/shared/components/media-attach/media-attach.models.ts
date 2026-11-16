import type { CreatePackPayload } from '../../../features/product/packs/packs.service';

export type PackImageEntry = NonNullable<CreatePackPayload['images']>[number];

export type AttachTarget =
  | { kind: 'GROUP'; id: string; name: string }
  | { kind: 'VARIANT'; id: string; name: string }
  | { kind: 'CATEGORY'; id: string; name: string }
  | { kind: 'PACK'; id: string; name: string; images: PackImageEntry[] };

export interface AttachOption {
  value: string;
  label: string;
  images?: PackImageEntry[];
}

export interface AttachResult {
  target: AttachTarget;
  ok: boolean;
  message: string;
}

export interface AttachPermissions {
  group: boolean;
  variant: boolean;
  category: boolean;
  pack: boolean;
}
