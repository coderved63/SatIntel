export function toApiParams(dateRange) {
  if (!dateRange) return {};
  return {
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  };
}

export function toRequestDateRange(dateRange) {
  if (!dateRange) return undefined;
  return {
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  };
}

export function displayWindow(dateRange) {
  if (!dateRange?.start_date || !dateRange?.end_date) return 'Window unavailable';
  return `${dateRange.start_date} to ${dateRange.end_date}`;
}
