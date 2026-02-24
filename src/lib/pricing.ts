// ═══════════════════════════════════════════════════════════════
// PRICING UTILITY — Dynamic pricing based on time/day/holidays
//
// Business hours (Mon-Fri 9am-5pm patient local time):
//   Instant/Refill: $189, Video/Phone: $199
// After-hours/weekends/holidays:
//   All types: $249
// ═══════════════════════════════════════════════════════════════

// US Federal Holidays (fixed dates + computed)
function getUSHolidays(year: number): Set<string> {
  const holidays = new Set<string>();
  const fmt = (m: number, d: number) => `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Fixed-date holidays
  holidays.add(fmt(1, 1));   // New Year's Day
  holidays.add(fmt(7, 4));   // Independence Day
  holidays.add(fmt(11, 11)); // Veterans Day
  holidays.add(fmt(12, 25)); // Christmas

  // Computed holidays
  // MLK Day: 3rd Monday of January
  const mlk = getNthWeekday(year, 0, 1, 3); // month 0 = Jan, weekday 1 = Monday
  holidays.add(fmt(1, mlk));

  // Presidents' Day: 3rd Monday of February
  const pres = getNthWeekday(year, 1, 1, 3);
  holidays.add(fmt(2, pres));

  // Memorial Day: Last Monday of May
  const mem = getLastWeekday(year, 4, 1);
  holidays.add(fmt(5, mem));

  // Labor Day: 1st Monday of September
  const labor = getNthWeekday(year, 8, 1, 1);
  holidays.add(fmt(9, labor));

  // Columbus Day: 2nd Monday of October
  const col = getNthWeekday(year, 9, 1, 2);
  holidays.add(fmt(10, col));

  // Thanksgiving: 4th Thursday of November
  const thanks = getNthWeekday(year, 10, 4, 4);
  holidays.add(fmt(11, thanks));

  return holidays;
}

function getNthWeekday(year: number, month: number, weekday: number, n: number): number {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month, day);
    if (d.getMonth() !== month) break;
    if (d.getDay() === weekday) {
      count++;
      if (count === n) return day;
    }
  }
  return 1;
}

function getLastWeekday(year: number, month: number, weekday: number): number {
  let last = 1;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month, day);
    if (d.getMonth() !== month) break;
    if (d.getDay() === weekday) last = day;
  }
  return last;
}

export interface PriceInfo {
  amount: number;       // cents (e.g. 18900)
  display: string;      // "$189"
  isAfterHours: boolean;
  isHoliday: boolean;
  isWeekend: boolean;
  label: string;        // "Business hours" or "After-hours" or "Weekend" or "Holiday"
}

export type VisitType = 'instant' | 'refill' | 'video' | 'phone';

export function getPrice(visitType: VisitType, timezone?: string): PriceInfo {
  const now = new Date();

  // Get current time in patient's timezone
  let hour: number, dayOfWeek: number, dateStr: string;
  try {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric', hour12: false,
      weekday: 'short',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);

    hour = parseInt(parts.find(p => p.type === 'hour')?.value || '12');
    const weekday = parts.find(p => p.type === 'weekday')?.value || 'Mon';
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    dayOfWeek = weekdayMap[weekday] ?? 1;

    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    dateStr = `${y}-${m}-${d}`;
  } catch {
    hour = now.getHours();
    dayOfWeek = now.getDay();
    dateStr = now.toISOString().split('T')[0];
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = getUSHolidays(now.getFullYear()).has(dateStr);
  const isBusinessHours = !isWeekend && !isHoliday && hour >= 9 && hour < 17;
  const isAfterHours = !isBusinessHours;

  let label = 'Business hours';
  if (isHoliday) label = 'Holiday';
  else if (isWeekend) label = 'Weekend';
  else if (isAfterHours) label = 'After-hours';

  if (isAfterHours) {
    return { amount: 24900, display: '$249', isAfterHours: true, isHoliday, isWeekend, label };
  }

  if (visitType === 'instant' || visitType === 'refill') {
    return { amount: 18900, display: '$189', isAfterHours: false, isHoliday, isWeekend, label };
  }

  // video or phone
  return { amount: 19900, display: '$199', isAfterHours: false, isHoliday, isWeekend, label };
}

// Booking reserve fee — flat $1.89 for express checkout
export function getBookingFee(): PriceInfo {
  return {
    amount: 189,
    display: '$1.89',
    isAfterHours: false,
    isHoliday: false,
    isWeekend: false,
    label: 'Booking fee',
  };
}

// Controlled substance names for refill detection
export const CONTROLLED_SUBSTANCES = new Set([
  // Schedule II - Stimulants
  'adderall', 'amphetamine', 'dextroamphetamine', 'vyvanse', 'lisdexamfetamine',
  'ritalin', 'methylphenidate', 'concerta', 'focalin', 'dexmethylphenidate',
  'desoxyn', 'methamphetamine', 'mydayis', 'evekeo', 'zenzedi', 'dyanavel',
  // Schedule II - Opioids
  'oxycodone', 'oxycontin', 'percocet', 'hydrocodone', 'vicodin', 'norco',
  'morphine', 'fentanyl', 'methadone', 'hydromorphone', 'dilaudid',
  'oxymorphone', 'opana', 'codeine', 'meperidine', 'demerol',
  // Schedule III
  'suboxone', 'buprenorphine', 'testosterone', 'ketamine', 'anabolic steroids',
  // Schedule IV
  'xanax', 'alprazolam', 'valium', 'diazepam', 'ativan', 'lorazepam',
  'klonopin', 'clonazepam', 'ambien', 'zolpidem', 'lunesta', 'eszopiclone',
  'tramadol', 'soma', 'carisoprodol', 'phenobarbital',
  'phentermine', 'adipex', 'qsymia', 'contrave',
  // Schedule V
  'lyrica', 'pregabalin', 'gabapentin', 'lacosamide',
]);

export function isControlledSubstance(medicationName: string): boolean {
  const lower = medicationName.toLowerCase().trim();
  for (const substance of CONTROLLED_SUBSTANCES) {
    if (lower.includes(substance)) return true;
  }
  return false;
}
