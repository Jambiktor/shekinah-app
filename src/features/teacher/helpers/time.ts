const padTwo = (value: number) => String(value).padStart(2, "0");

const formatTime12h = (value: string) => {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) {
    return null;
  }

  const hoursRaw = Number(match[1]);
  const minutesRaw = match[2] ? Number(match[2]) : 0;
  const meridiemRaw = match[3]?.toLowerCase() || "";

  if (
    Number.isNaN(hoursRaw) ||
    Number.isNaN(minutesRaw) ||
    minutesRaw < 0 ||
    minutesRaw > 59
  ) {
    return null;
  }

  let hours = hoursRaw;
  let meridiem = meridiemRaw;

  if (!meridiem) {
    if (hours < 0 || hours > 23) {
      return null;
    }
    if (hours === 0) {
      hours = 12;
      meridiem = "am";
    } else if (hours === 12) {
      meridiem = "pm";
    } else if (hours > 12) {
      hours -= 12;
      meridiem = "pm";
    } else {
      meridiem = "am";
    }
  } else {
    if (hours < 1 || hours > 12) {
      return null;
    }
  }

  return `${hours}:${padTwo(minutesRaw)} ${meridiem.toUpperCase()}`;
};

export const formatTimeRange12h = (value?: string | null) => {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "";
  }

  const parts = trimmed.split(/\s*[-–—]\s*/);
  if (parts.length === 1) {
    return formatTime12h(parts[0]) ?? trimmed;
  }
  if (parts.length >= 2) {
    const start = formatTime12h(parts[0]);
    const end = formatTime12h(parts[1]);
    if (!start || !end) {
      return trimmed;
    }
    return `${start} - ${end}`;
  }

  return trimmed;
};

const parseTimeToMinutes = (value: string) => {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) {
    return null;
  }

  const hoursRaw = Number(match[1]);
  const minutesRaw = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (
    Number.isNaN(hoursRaw) ||
    Number.isNaN(minutesRaw) ||
    minutesRaw < 0 ||
    minutesRaw > 59
  ) {
    return null;
  }

  let hours = hoursRaw;
  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null;
    }
    if (hours === 12) {
      hours = meridiem === "am" ? 0 : 12;
    } else if (meridiem === "pm") {
      hours += 12;
    }
  } else {
    if (hours < 0 || hours > 23) {
      return null;
    }
  }

  return hours * 60 + minutesRaw;
};

export const parseTimeRangeToMinutes = (value?: string | null) => {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split(/\s*[-–—]\s*/);
  if (parts.length < 2) {
    return null;
  }

  const start = parseTimeToMinutes(parts[0]);
  const end = parseTimeToMinutes(parts[1]);
  if (start === null || end === null) {
    return null;
  }

  return { start, end };
};
