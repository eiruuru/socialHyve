import { COMMON_TIMEZONES, formatTimezoneLabel, getBrowserTimezone } from '@/lib/scheduleTime';
import { cn } from '@/lib/utils';

export function TimezoneSelect({ value, onChange, className, id }) {
  const browserTz = getBrowserTimezone();
  const options = [
    { value: browserTz, label: `Browser (${formatTimezoneLabel(browserTz)})` },
    ...COMMON_TIMEZONES.filter((tz) => tz.value !== browserTz),
  ];

  return (
    <select
      id={id}
      value={value || browserTz}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {options.map((tz) => (
        <option key={tz.value} value={tz.value}>
          {tz.label}
        </option>
      ))}
    </select>
  );
}
