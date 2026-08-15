const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getScheduleUrgency(scheduledAt) {
  if (!scheduledAt) return null;

  const scheduledMs = new Date(scheduledAt).getTime();
  if (Number.isNaN(scheduledMs)) return null;

  const daysUntil = (scheduledMs - Date.now()) / MS_PER_DAY;

  if (daysUntil < 0) {
    return {
      urgencyLabel: 'Past scheduled time',
      shortLabel: 'Past due',
      borderClass: 'border-2 border-red-500',
      badgeClass: 'bg-red-600 text-white',
      textClass: 'text-muted-foreground',
    };
  }
  if (daysUntil < 2) {
    return {
      urgencyLabel: 'Less than 2 days — approve soon',
      shortLabel: '<2 days',
      borderClass: 'border-2 border-red-500',
      badgeClass: 'bg-red-600 text-white',
      textClass: 'text-muted-foreground',
    };
  }
  if (daysUntil < 5) {
    return {
      urgencyLabel: 'Less than 5 days',
      shortLabel: '<5 days',
      borderClass: 'border-2 border-amber-400',
      badgeClass: 'bg-amber-500 text-white',
      textClass: 'text-muted-foreground',
    };
  }

  const daysLabel = Math.ceil(daysUntil);
  return {
    urgencyLabel: `${daysLabel} day${daysLabel === 1 ? '' : 's'} until scheduled`,
    shortLabel: `${daysLabel}d`,
    borderClass: 'border-2 border-emerald-400',
    badgeClass: 'bg-emerald-600 text-white',
    textClass: 'text-muted-foreground',
  };
}
