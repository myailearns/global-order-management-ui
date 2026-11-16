import { escapeSearchTerm, toPackImageFormat } from './media-attach.service';

describe('media-attach.service helpers', () => {
  describe('escapeSearchTerm', () => {
    it('escapes regex metacharacters', () => {
      expect(escapeSearchTerm('a.b*c(d)')).toBe('a\\.b\\*c\\(d\\)');
      expect(escapeSearchTerm('(a+)+$')).toBe('\\(a\\+\\)\\+\\$');
    });

    it('trims whitespace and keeps plain text', () => {
      expect(escapeSearchTerm('  rice 5kg ')).toBe('rice 5kg');
    });
  });

  describe('toPackImageFormat', () => {
    it('maps known formats', () => {
      expect(toPackImageFormat('png')).toBe('PNG');
      expect(toPackImageFormat('WEBP')).toBe('WEBP');
    });

    it('falls back to JPEG', () => {
      expect(toPackImageFormat('jpg')).toBe('JPEG');
      expect(toPackImageFormat(undefined)).toBe('JPEG');
    });
  });
});
