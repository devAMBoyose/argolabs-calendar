export const PHILIPPINE_TIME_ZONE = "Asia/Manila";
export const PHILIPPINE_UTC_OFFSET = "+08:00";

const pad = (value) => String(value).padStart(2, "0");

export function safeDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }

  if (value === null || value === undefined || value === "") return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getPhilippineDateParts(value) {
  const date = safeDate(value);
  if (!date) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
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

export function toPhilippineDateKey(value) {
  const parts = getPhilippineDateParts(value);
  if (!parts) return "";

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function toPhilippineDateTimeInput(value) {
  const parts = getPhilippineDateParts(value);
  if (!parts) return "";

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function philippineInputToUtc(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const normalized = text.length === 16 ? `${text}:00` : text;
  const date = new Date(`${normalized}${PHILIPPINE_UTC_OFFSET}`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid Philippine date and time.");
  }

  return date.toISOString();
}

export function formatPhilippineDateTime(value, options = {}) {
  const date = safeDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PHILIPPINE_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  }).format(date);
}

export function formatPhilippineTime(value) {
  const date = safeDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PHILIPPINE_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
