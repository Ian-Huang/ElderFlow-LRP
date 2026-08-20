import { describe, expect, it } from 'vitest';
import { calculateCareRecordCompleteness, type CareRecordActivityDraft } from '@/utils/careRecordScore';

function createActivity(overrides: Partial<CareRecordActivityDraft> = {}): CareRecordActivityDraft {
  return {
    type: 'Meal',
    assistanceLevel: 'PartialAssist',
    notes: '已完成餵食',
    durationMinutes: 20,
    ...overrides,
  };
}

describe('calculateCareRecordCompleteness', () => {
  it('returns high score when required fields complete', () => {
    const result = calculateCareRecordCompleteness({
      residentId: 'RES-001',
      activities: [
        createActivity(),
        createActivity({
          type: 'VitalSigns',
          vitals: {
            systolic: 125,
            diastolic: 78,
            pulse: 72,
            temperature: 36.7,
          },
        }),
      ],
      evidenceCount: 1,
    });

    expect(result.score).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it('flags missing vital signs fields', () => {
    const result = calculateCareRecordCompleteness({
      residentId: 'RES-001',
      activities: [
        createActivity({
          type: 'VitalSigns',
          vitals: {
            systolic: 120,
            diastolic: '',
            pulse: 70,
            temperature: 36.5,
          },
        }),
      ],
      evidenceCount: 0,
    });

    expect(result.score).toBeLessThan(100);
    expect(result.missing).toContain('生命徵象需填寫血壓、脈搏、體溫');
    expect(result.missing).toContain('請上傳照片或影片佐證');
  });

  it('flags empty activities', () => {
    const result = calculateCareRecordCompleteness({
      residentId: '',
      activities: [],
      evidenceCount: 0,
    });

    expect(result.score).toBe(20);
    expect(result.missing).toContain('請選擇住民');
    expect(result.missing).toContain('至少新增一項照護活動');
  });
});
