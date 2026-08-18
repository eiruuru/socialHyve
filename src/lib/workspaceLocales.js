/** BCP 47 locales supported as workspace defaults. */
export const WORKSPACE_LOCALES = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'en-CA', label: 'English (Canada)' },
  { value: 'en-PH', label: 'English (Philippines)' },
  { value: 'en-SG', label: 'English (Singapore)' },
  { value: 'en-NZ', label: 'English (New Zealand)' },
  { value: 'en-IE', label: 'English (Ireland)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'fr-CA', label: 'French (Canada)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ja-JP', label: 'Japanese (Japan)' },
  { value: 'ko-KR', label: 'Korean (South Korea)' },
  { value: 'zh-CN', label: 'Chinese (China)' },
  { value: 'zh-TW', label: 'Chinese (Taiwan)' },
  { value: 'hi-IN', label: 'Hindi (India)' },
  { value: 'ar-AE', label: 'Arabic (United Arab Emirates)' },
];

export function getBrowserLocale() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (!locale) return 'en-US';
    const normalized = locale.replace('_', '-');
    const exact = WORKSPACE_LOCALES.find((item) => item.value === normalized);
    if (exact) return exact.value;
    const lang = normalized.split('-')[0];
    const fallback = WORKSPACE_LOCALES.find((item) => item.value.startsWith(`${lang}-`));
    return fallback?.value || 'en-US';
  } catch {
    return 'en-US';
  }
}

export function formatLocaleLabel(locale) {
  if (!locale) return 'English (United States)';
  return WORKSPACE_LOCALES.find((item) => item.value === locale)?.label || locale;
}

export function resolveWorkspaceLocale(workspaceLocale) {
  return workspaceLocale || getBrowserLocale();
}
