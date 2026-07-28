export const PHILIPPINE_TIME_ZONE = 'Asia/Manila';
export const PHILIPPINE_UTC_OFFSET = '+08:00';

const pad = (value) => String(value).padStart(2, '0');

export function parsePhilippineDateTime(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const text = String(value || '').trim();
  if (!text) return null;

  let normalized = text
    .replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/, '$1T$2')
    .replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const hasExplicitZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized);
  const isLocalDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(normalized);

  if (!hasExplicitZone && isLocalDateTime) {
    normalized = `${normalized}${PHILIPPINE_UTC_OFFSET}`;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getPhilippineDateParts(value) {
  const date = parsePhilippineDateTime(value);
  if (!date) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function toPhilippineRfc3339(value) {
  const parts = getPhilippineDateParts(value);
  if (!parts) throw new Error('Invalid event date and time.');

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${PHILIPPINE_UTC_OFFSET}`;
}

export function formatPhilippineDateTime(value, options = {}) {
  const date = parsePhilippineDateTime(value);
  if (!date) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: PHILIPPINE_TIME_ZONE,
    ...options,
  }).format(date);
}

export function addPhilippineDaysAtTime(base, days, hour = 9, minute = 0) {
  const parts = getPhilippineDateParts(base);
  if (!parts) throw new Error('Invalid base date.');

  const dateMarker = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  const year = dateMarker.getUTCFullYear();
  const month = pad(dateMarker.getUTCMonth() + 1);
  const day = pad(dateMarker.getUTCDate());

  return new Date(
    `${year}-${month}-${day}T${pad(hour)}:${pad(minute)}:00${PHILIPPINE_UTC_OFFSET}`
  );
}
