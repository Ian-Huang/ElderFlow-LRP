import type { CareActivityType } from '@lrp/shared';

export interface CareRecordActivityDraft {
  type: CareActivityType;
  assistanceLevel: 'Independent' | 'Supervision' | 'PartialAssist' | 'TotalAssist' | '';
  notes: string;
  durationMinutes: number | '';
  vitals?: {
    systolic?: number | '';
    diastolic?: number | '';
    pulse?: number | '';
    temperature?: number | '';
  };
}

export interface CareRecordScoreInput {
  residentId: string;
  activities: CareRecordActivityDraft[];
  evidenceCount: number;
}

export interface CareRecordScoreResult {
  score: number;
  missing: string[];
}

function hasValue(value: unknown) {
  return value !== '' && value !== null && value !== undefined;
}

function hasCompleteVitalSigns(activity: CareRecordActivityDraft) {
  if (activity.type !== 'VitalSigns') return true;
  const vitals = activity.vitals;
  if (!vitals) return false;
  return (
    hasValue(vitals.systolic) &&
    hasValue(vitals.diastolic) &&
    hasValue(vitals.pulse) &&
    hasValue(vitals.temperature)
  );
}

export function calculateCareRecordCompleteness(input: CareRecordScoreInput): CareRecordScoreResult {
  let score = 0;
  const missing: string[] = [];

  if (input.residentId) {
    score += 20;
  } else {
    missing.push('請選擇住民');
  }

  if (input.activities.length > 0) {
    score += 30;
  } else {
    missing.push('至少新增一項照護活動');
  }

  const hasIncompleteActivity = input.activities.some(
    (activity) => !activity.assistanceLevel || !activity.notes.trim() || !hasValue(activity.durationMinutes)
  );
  if (input.activities.length > 0 && !hasIncompleteActivity) {
    score += 20;
  } else if (input.activities.length > 0) {
    missing.push('活動需填協助等級、持續時間、備註');
  }

  const hasVitalSigns = input.activities.some((activity) => activity.type === 'VitalSigns');
  const missingVitalSigns = input.activities.some((activity) => !hasCompleteVitalSigns(activity));

  if (!hasVitalSigns) {
    missing.push('建議至少一筆生命徵象活動');
  }

  if (!missingVitalSigns) {
    score += 20;
  } else {
    missing.push('生命徵象需填寫血壓、脈搏、體溫');
  }

  if (input.evidenceCount > 0) {
    score += 10;
  } else {
    missing.push('請上傳照片或影片佐證');
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    missing,
  };
}
