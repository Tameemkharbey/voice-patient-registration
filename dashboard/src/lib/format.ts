export const formatPhone = (digits: string): string => {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 10) return digits;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

export const initials = (first: string, last: string): string =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

// Patient DOB comes back as MM/DD/YYYY.
export const ageFromUsDate = (mmddyyyy: string): number | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(mmddyyyy);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const dob = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
};

// <input type="date"> gives YYYY-MM-DD; the API filter expects MM/DD/YYYY.
export const isoInputToUsDate = (iso: string): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, yyyy, mm, dd] = match;
  return `${mm}/${dd}/${yyyy}`;
};

export const usDateToIsoInput = (mmddyyyy: string): string => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(mmddyyyy);
  if (!match) return '';
  const [, mm, dd, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
};

export const relativeTime = (isoTimestamp: string): string => {
  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) return isoTimestamp;
  const diffMs = Date.now() - then;
  const diffSec = Math.round(diffMs / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(diffSec) >= secondsInUnit) {
      return rtf.format(Math.round(-diffSec / secondsInUnit), unit);
    }
  }
  return rtf.format(-diffSec, 'second');
};

export const formatDateTime = (isoTimestamp: string): string => {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const isToday = (isoTimestamp: string): boolean => {
  const date = new Date(isoTimestamp);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

export const isWithinDays = (isoTimestamp: string, days: number): boolean => {
  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) return false;
  return Date.now() - then <= days * 86400000;
};

export const formatDuration = (seconds: number | null): string => {
  if (seconds === null || Number.isNaN(seconds) || seconds < 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ENDED_REASON_LABELS: Record<string, string> = {
  'customer-ended-call': 'Caller hung up',
  'assistant-ended-call': 'Riley ended the call',
  'silence-timed-out': 'Call timed out',
  'exceeded-max-duration': 'Max duration reached',
  'assistant-error': 'Assistant error',
  'phone-call-provider-closed-websocket': 'Connection dropped',
};

export const humanizeEndedReason = (reason: string | null): string => {
  if (!reason) return 'In progress';
  if (ENDED_REASON_LABELS[reason]) return ENDED_REASON_LABELS[reason]!;
  return reason
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const maskCallerNumber = (raw: string | null): string => {
  if (!raw) return 'Web call';
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) return 'Unknown caller';
  return `(•••) •••-${digits.slice(-4)}`;
};

export const isThisWeek = (isoTimestamp: string): boolean => {
  const date = new Date(isoTimestamp).getTime();
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return date >= start.getTime();
};
