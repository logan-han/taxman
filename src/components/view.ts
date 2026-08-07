export type ViewPeriod = 'weekly' | 'fortnightly' | 'monthly' | 'annually';

export const VIEW_OPTIONS: { label: string; value: ViewPeriod }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Fortnightly', value: 'fortnightly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Annually', value: 'annually' },
];

export const VIEW_DIVISOR: Record<ViewPeriod, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  annually: 1,
};

export const VIEW_PERIOD_LABEL: Record<ViewPeriod, string> = {
  weekly: 'a week',
  fortnightly: 'a fortnight',
  monthly: 'a month',
  annually: 'a year',
};

export const VIEW_COLUMN_LABEL: Record<ViewPeriod, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  annually: 'Annual',
};
