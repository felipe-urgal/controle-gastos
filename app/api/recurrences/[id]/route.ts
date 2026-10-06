import { endRecurrenceSeries } from '@/app/lib/recurrences/end-series';
import { updateRecurrenceSeries } from '@/app/lib/recurrences/update-series';

export const PATCH = updateRecurrenceSeries;
export const DELETE = endRecurrenceSeries;
