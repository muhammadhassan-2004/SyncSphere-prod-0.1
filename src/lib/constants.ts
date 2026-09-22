export const INDUSTRIES = [
  'Artificial Intelligence & Machine Learning',
  'FinTech & Blockchain',
  'Healthcare & Biotechnology',
  'SaaS & Enterprise Software',
  'E-Commerce & Digital Retail',
  'Cybersecurity & Infrastructure',
  'Developer Tools & DevOps',
  'Media & Entertainment Technology',
];

export const COMPANY_SIZES = [
  '1-10 employees (Seed / Early Stage)',
  '11-50 employees (Growth Stage)',
  '51-200 employees (Mid-Market)',
  '201-500 employees (Scale-up)',
  '500+ employees (Enterprise)',
];

export const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'France',
  'Australia',
  'Singapore',
  'Japan',
  'India',
  'Netherlands',
];

export const TIMEZONES = [
  'UTC-08:00 (Pacific Time - US & Canada)',
  'UTC-07:00 (Mountain Time - US & Canada)',
  'UTC-06:00 (Central Time - US & Canada)',
  'UTC-05:00 (Eastern Time - US & Canada)',
  'UTC+00:00 (Greenwich Mean Time - London)',
  'UTC+01:00 (Central European Time - Paris)',
  'UTC+05:30 (Indian Standard Time - New Delhi)',
  'UTC+08:00 (Singapore Standard Time - Singapore)',
  'UTC+09:00 (Japan Standard Time - Tokyo)',
];

export function normalizeCompanySize(val?: string): string {
  if (!val) return COMPANY_SIZES[1]; // default Growth Stage
  if (COMPANY_SIZES.includes(val)) return val;
  const lower = val.toLowerCase();
  if (lower.includes('1-10') || lower.includes('seed') || lower.includes('startup')) {
    return COMPANY_SIZES[0];
  }
  if (lower.includes('11-50') || lower.includes('growth')) {
    return COMPANY_SIZES[1];
  }
  if (lower.includes('51-200') || lower.includes('mid')) {
    return COMPANY_SIZES[2];
  }
  if (lower.includes('201-500') || lower.includes('scale')) {
    return COMPANY_SIZES[3];
  }
  if (lower.includes('500+') || lower.includes('200+') || lower.includes('enterprise')) {
    return COMPANY_SIZES[4];
  }
  return val;
}

export function normalizeCountry(val?: string): string {
  if (!val || !val.trim()) return 'United States';
  const trimmed = val.trim();
  if (COUNTRIES.includes(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  if (lower.includes('united states') || lower.includes('usa') || lower.includes('u.s.') || lower.includes('san francisco') || lower.includes('new york') || lower.includes('california') || lower.includes('ca')) {
    return 'United States';
  }
  if (lower.includes('united kingdom') || lower.includes('uk') || lower.includes('u.k.') || lower.includes('london') || lower.includes('england')) {
    return 'United Kingdom';
  }
  if (lower.includes('canada') || lower.includes('toronto') || lower.includes('vancouver')) {
    return 'Canada';
  }
  if (lower.includes('germany') || lower.includes('berlin')) {
    return 'Germany';
  }
  if (lower.includes('france') || lower.includes('paris')) {
    return 'France';
  }
  if (lower.includes('australia') || lower.includes('sydney') || lower.includes('melbourne')) {
    return 'Australia';
  }
  if (lower.includes('singapore')) {
    return 'Singapore';
  }
  if (lower.includes('japan') || lower.includes('tokyo')) {
    return 'Japan';
  }
  if (lower.includes('india') || lower.includes('delhi') || lower.includes('bangalore') || lower.includes('mumbai')) {
    return 'India';
  }
  if (lower.includes('netherlands') || lower.includes('amsterdam')) {
    return 'Netherlands';
  }
  return trimmed;
}

export function getDetectedTimezone(currentTimezone?: string): string {
  if (currentTimezone && TIMEZONES.includes(currentTimezone)) {
    return currentTimezone;
  }
  try {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const offsetHours = offsetMinutes / 60;
    
    if (offsetHours <= -8) return 'UTC-08:00 (Pacific Time - US & Canada)';
    if (offsetHours <= -7) return 'UTC-07:00 (Mountain Time - US & Canada)';
    if (offsetHours <= -6) return 'UTC-06:00 (Central Time - US & Canada)';
    if (offsetHours <= -4) return 'UTC-05:00 (Eastern Time - US & Canada)';
    if (offsetHours >= 0 && offsetHours < 1) return 'UTC+00:00 (Greenwich Mean Time - London)';
    if (offsetHours >= 1 && offsetHours < 4) return 'UTC+01:00 (Central European Time - Paris)';
    if (offsetHours >= 5 && offsetHours < 6) return 'UTC+05:30 (Indian Standard Time - New Delhi)';
    if (offsetHours >= 7 && offsetHours < 8.5) return 'UTC+08:00 (Singapore Standard Time - Singapore)';
    if (offsetHours >= 8.5) return 'UTC+09:00 (Japan Standard Time - Tokyo)';
  } catch {}
  return 'UTC-05:00 (Eastern Time - US & Canada)';
}

export function normalizeIndustry(val?: string): string {
  if (!val || !val.trim()) return INDUSTRIES[6]; // 'Developer Tools & DevOps'
  const trimmed = val.trim();
  if (INDUSTRIES.includes(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  const found = INDUSTRIES.find((i) => i.toLowerCase().includes(lower) || lower.includes(i.toLowerCase()));
  return found || trimmed;
}
