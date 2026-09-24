// Pure normalize-or-reject helpers shared by body validation and query-filter parsing.

// Strip control characters, unify curly apostrophes, collapse whitespace.
export const sanitizeText = (value: string): string =>
  value
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const pad2 = (n: number): string => String(n).padStart(2, '0');

export const todayIsoUtc = (): string => new Date().toISOString().slice(0, 10);

// Accepts MM/DD/YYYY (spec format) or ISO YYYY-MM-DD; returns ISO or null if not a real calendar date.
export const parseDate = (raw: string): string | null => {
  const us = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(raw);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const [year, month, day] = us
    ? [Number(us[3]), Number(us[1]), Number(us[2])]
    : iso
      ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
      : [NaN, NaN, NaN];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

// ISO YYYY-MM-DD -> MM/DD/YYYY for API output.
export const isoToUsDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
};

// US 10-digit number; tolerates +1 prefix and common punctuation. Area code must start 2-9.
// Exchange digits are not NANP-checked so demo numbers like 555-123-4567 are accepted.
export const normalizePhone = (raw: string): string | null => {
  if (!/^[\d\s().+-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return /^[2-9]\d{9}$/.test(ten) ? ten : null;
};

// 5-digit or ZIP+4; accepts 9 bare digits and inserts the dash.
export const normalizeZip = (raw: string): string | null => {
  const compact = raw.replace(/\s/g, '');
  if (/^\d{5}$/.test(compact)) return compact;
  const plus4 = /^(\d{5})-?(\d{4})$/.exec(compact);
  return plus4 ? `${plus4[1]}-${plus4[2]}` : null;
};

export const SEX_VALUES = ['Male', 'Female', 'Other', 'Decline to Answer'] as const;
export type Sex = (typeof SEX_VALUES)[number];

const SEX_ALIASES: Record<string, Sex> = {
  male: 'Male', m: 'Male', man: 'Male',
  female: 'Female', f: 'Female', woman: 'Female',
  other: 'Other',
  'decline to answer': 'Decline to Answer', decline: 'Decline to Answer',
  'prefer not to say': 'Decline to Answer', 'prefer not to answer': 'Decline to Answer',
};

export const normalizeSex = (raw: string): Sex | null => SEX_ALIASES[raw.trim().toLowerCase()] ?? null;
