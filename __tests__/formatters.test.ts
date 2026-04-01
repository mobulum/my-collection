import { normalizeFormat } from '../src/utils/formatters';

describe('normalizeFormat', () => {
  describe('CD formats', () => {
    it('maps basic CD format', () => {
      expect(normalizeFormat('CD, Album')).toBe('CD');
    });

    it('maps multi-disc CD', () => {
      expect(normalizeFormat('2xCD, Album')).toBe('CD');
    });

    it('maps CD compilation', () => {
      expect(normalizeFormat('CD, Compilation')).toBe('CD');
    });

    it('maps SACD to CD', () => {
      expect(normalizeFormat('SACD, Album')).toBe('CD');
    });

    it('maps CD with reissue suffix', () => {
      expect(normalizeFormat('CD, Album, RE')).toBe('CD');
    });
  });

  describe('VINYL formats', () => {
    it('maps LP format', () => {
      expect(normalizeFormat('LP, Album')).toBe('VINYL');
    });

    it('maps LP with reissue', () => {
      expect(normalizeFormat('LP, Album, RE')).toBe('VINYL');
    });

    it('maps multi-disc LP', () => {
      expect(normalizeFormat('2xLP, Album')).toBe('VINYL');
    });

    it('maps vinyl keyword', () => {
      expect(normalizeFormat('Vinyl, Single')).toBe('VINYL');
    });

    it('maps 7" single', () => {
      expect(normalizeFormat('7", Single')).toBe('VINYL');
    });

    it('maps 10" record', () => {
      expect(normalizeFormat('10", EP')).toBe('VINYL');
    });

    it('maps 12" record', () => {
      expect(normalizeFormat('12", Maxi-Single')).toBe('VINYL');
    });
  });

  describe('DVD formats', () => {
    it('maps DVD format', () => {
      expect(normalizeFormat('DVD, DVD-Video')).toBe('DVD');
    });

    it('maps DVD with album', () => {
      expect(normalizeFormat('DVD, Album')).toBe('DVD');
    });
  });

  describe('BD formats', () => {
    it('maps Blu-ray format', () => {
      expect(normalizeFormat('Blu-ray, Blu-ray Audio')).toBe('BD');
    });

    it('maps Blu-ray over CD (avoids false SACD match)', () => {
      expect(normalizeFormat('SACD, Blu-ray Audio')).toBe('BD');
    });

    it('maps BD keyword', () => {
      expect(normalizeFormat('BD, Album')).toBe('BD');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for empty input', () => {
      expect(normalizeFormat('')).toBe('');
    });

    it('is case-insensitive', () => {
      expect(normalizeFormat('cd, album')).toBe('CD');
      expect(normalizeFormat('BLU-RAY')).toBe('BD');
      expect(normalizeFormat('Dvd')).toBe('DVD');
    });

    it('returns original string when no keyword matches', () => {
      expect(normalizeFormat('Cassette, Album')).toBe('Cassette, Album');
    });

    it('respects priority order (Blu-ray before CD)', () => {
      expect(normalizeFormat('Blu-ray, CD')).toBe('BD');
    });
  });
});
