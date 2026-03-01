export const FEATURES = {
  SQL_EDITOR: true,
  CHARTS: true,
  DASHBOARDS: true,
  PUBLIC_SHARING: false,
  SCHEDULED_REPORTS: false,
  DATA_MODELS: false,
  ROW_LEVEL_SECURITY: false,
  AI_INSIGHTS: false,
} as const;

export type FeatureFlag = keyof typeof FEATURES;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURES[flag];
}
