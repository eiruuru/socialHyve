const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getScheduleUrgency(scheduledAt) {
  if (!scheduledAt) return null;

  const scheduledMs = new Date(scheduledAt).getTime();
  if (Number.isNaN(scheduledMs)) return null;

  const daysUntil = (scheduledMs - Date.now()) / MS_PER_DAY;

  if (daysUntil < 0) {
    return {
      urgencyLabel: 'Past scheduled time',
      borderClass: 'border-2 border-red-500',
      textClass: 'text-red-700',
    };
  }
  if (daysUntil < 2) {
    return {
      urgencyLabel: 'Less than 2 days — approve soon',
      borderClass: 'border-2 border-red-500',
      textClass: 'text-red-700',
    };
  }
  if (daysUntil < 5) {
    return {
      urgencyLabel: 'Less than 5 days',
      borderClass: 'border-2 border-amber-400',
      textClass: 'text-amber-800',
    };
  }

  const daysLabel = Math.ceil(daysUntil);
  return {
    urgencyLabel: `${daysLabel} day${daysLabel === 1 ? '' : 's'} until scheduled`,
    borderClass: 'border-2 border-emerald-400',
    textClass: 'text-emerald-800',
  };
}
