export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatPeriodMonth(period: string): string {
  if (!period || !period.includes('-')) return period;
  const [year, monthStr] = period.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${INDONESIAN_MONTHS[monthIdx]} ${year}`;
  }
  return period;
}

export function getCurrentPeriodMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function generateReceiptNumber(periodMonth: string): string {
  const cleanPeriod = periodMonth.replace('-', '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `KWT-${cleanPeriod}-${randomSuffix}`;
}

export function generateOtherIncomeReceiptNumber(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `KWT-PL-${year}${month}-${randomSuffix}`;
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function getAvailablePeriodMonths(rangeYearsBack = 1, rangeYearsForward = 1): { value: string; label: string }[] {
  const current = new Date();
  const currentYear = current.getFullYear();
  const options: { value: string; label: string }[] = [];

  for (let y = currentYear + rangeYearsForward; y >= currentYear - rangeYearsBack; y--) {
    for (let m = 12; m >= 1; m--) {
      const monthStr = String(m).padStart(2, '0');
      const val = `${y}-${monthStr}`;
      options.push({
        value: val,
        label: `${INDONESIAN_MONTHS[m - 1]} ${y}`,
      });
    }
  }
  return options;
}

export function formatPhoneNumberForWhatsApp(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }
  return clean;
}
