import {
  cToF,
  kmhToMph,
  formatDayLabel,
  formatHourLabel,
  localDateFromOffset,
} from '../src/utils/format';

describe('unit conversion', () => {
  test('cToF converts the fixed points', () => {
    expect(cToF(0)).toBe(32);
    expect(cToF(100)).toBe(212);
    expect(cToF(-40)).toBe(-40);
  });

  test('kmhToMph', () => {
    expect(kmhToMph(100)).toBeCloseTo(62.14, 2);
  });
});

describe('labels', () => {
  test('first entry is always "Today" / "Now"', () => {
    const d = new Date(2026, 9, 10, 14);
    expect(formatDayLabel(d, 0)).toBe('Today');
    expect(formatHourLabel(d, 0)).toBe('Now');
  });
});

describe('localDateFromOffset', () => {
  afterEach(() => jest.restoreAllMocks());

  test('returns the location wall-clock time, whatever the device time zone', () => {
    // 2026-10-10 05:00 UTC. Kyoto is UTC+9, so it is 14:00 there.
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 10, 5, 0));
    const now = localDateFromOffset(9 * 3600);
    // Read back with device-local getters, the way the UI does.
    expect(now.getHours()).toBe(14);
    expect(now.getDate()).toBe(10);
  });

  test('agrees with how Open-Meteo times are parsed', () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 10, 5, 30));
    const now = localDateFromOffset(9 * 3600);
    // Open-Meteo sends "2026-10-10T14:00" for the Kyoto hour containing now.
    const hourStart = new Date('2026-10-10T14:00');
    const nextHour = new Date('2026-10-10T15:00');
    expect(now >= hourStart && now < nextHour).toBe(true);
  });
});
