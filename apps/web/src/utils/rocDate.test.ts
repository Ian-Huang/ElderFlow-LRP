import { describe, it, expect } from 'vitest';
import {
  rocToIso,
  isoToRoc,
  formatRocDateDisplay,
  calculateAge,
  isThreePipe,
  parsePipesString,
  formatDate,
} from './rocDate';

describe('rocDate utilities', () => {
  describe('rocToIso', () => {
    it('converts 3-digit ROC year', () => {
      expect(rocToIso('111/01/21')).toBe('2022-01-21');
      expect(rocToIso('114/05/28')).toBe('2025-05-28');
    });

    it('converts 3-digit ROC year with leading zero', () => {
      expect(rocToIso('035/01/13')).toBe('1946-01-13');
      expect(rocToIso('048/06/05')).toBe('1959-06-05');
    });

    it('converts 2-digit ROC year', () => {
      expect(rocToIso('97/04/12')).toBe('2008-04-12');
    });

    it('preserves ISO formatted dates', () => {
      expect(rocToIso('2023-06-01')).toBe('2023-06-01');
      expect(rocToIso('1945/03/15')).toBe('1945-03-15');
    });

    it('handles empty or invalid strings gracefully', () => {
      expect(rocToIso('')).toBe('');
      expect(rocToIso('invalid')).toBe('invalid');
    });
  });

  describe('isoToRoc', () => {
    it('converts ISO date to 3-digit padded ROC date', () => {
      expect(isoToRoc('1946-01-13')).toBe('035/01/13');
      expect(isoToRoc('2022-01-21')).toBe('111/01/21');
      expect(isoToRoc('2008-04-12')).toBe('097/04/12');
    });
  });

  describe('formatRocDateDisplay', () => {
    it('formats date with both ROC and AD year', () => {
      expect(formatRocDateDisplay('111/01/21')).toBe('民國 111 年 01 月 21 日 (2022/01/21)');
      expect(formatRocDateDisplay('1946-01-13')).toBe('民國 35 年 01 月 13 日 (1946/01/13)');
    });
  });

  describe('calculateAge', () => {
    it('calculates age correctly from ROC string or ISO string', () => {
      const currentYear = new Date().getFullYear();
      // Born in 1946
      const age1946 = currentYear - 1946;
      expect(calculateAge('035/01/13')).toBeGreaterThanOrEqual(age1946 - 1);
      expect(calculateAge('1946-01-13')).toBeGreaterThanOrEqual(age1946 - 1);
    });
  });

  describe('isThreePipe', () => {
    it('identifies three-pipe keywords', () => {
      expect(isThreePipe('尿管、鼻胃管')).toBe(true);
      expect(isThreePipe('鼻胃管')).toBe(true);
      expect(isThreePipe('導尿管')).toBe(true);
      expect(isThreePipe('氣切管')).toBe(true);
      expect(isThreePipe(['尿管', '鼻胃管'])).toBe(true);
      expect(isThreePipe(['造廔口'])).toBe(false);
      expect(isThreePipe('')).toBe(false);
      expect(isThreePipe(undefined)).toBe(false);
    });
  });

  describe('parsePipesString', () => {
    it('splits pipe string into clean array', () => {
      expect(parsePipesString('尿管、鼻胃管')).toEqual(['尿管', '鼻胃管']);
      expect(parsePipesString('鼻胃管, 導尿管 ; 氣切管')).toEqual(['鼻胃管', '導尿管', '氣切管']);
      expect(parsePipesString('')).toEqual([]);
    });
  });

  describe('formatDate', () => {
    it('formats dates consistently to YYYY/MM/DD', () => {
      expect(formatDate('111/01/21')).toBe('2022/01/21');
      expect(formatDate('2022-01-21')).toBe('2022/01/21');
      expect(formatDate('')).toBe('—');
    });
  });
});
