import { themeKeyForCode, getWeatherTheme } from '../src/theme/weatherThemes';
import { parseBriefing } from '../src/hooks/useWeatherBriefing';

describe('themeKeyForCode (WMO weather codes)', () => {
  test.each([
    [0, 'clear'],
    [1, 'mainlyClear'],
    [2, 'partlyCloudy'],
    [3, 'overcast'],
    [45, 'fog'],
    [53, 'drizzle'],
    [63, 'rain'],
    [82, 'heavyRain'],
    [75, 'snow'],
    [95, 'thunder'],
  ])('code %p -> %p', (code, key) => {
    expect(themeKeyForCode(code)).toBe(key);
  });

  test('unknown codes fall back instead of crashing', () => {
    expect(themeKeyForCode(12345)).toBe('partlyCloudy');
  });

  test('day and night use different gradients', () => {
    expect(getWeatherTheme(0, true).colors).not.toEqual(getWeatherTheme(0, false).colors);
  });
});

describe('parseBriefing', () => {
  test('splits headline, body and advisories', () => {
    const text = [
      'Clear and warm this afternoon.',
      'A light breeze from the southwest.',
      'Cooler after dark.',
      '- UV is high until 3 PM.',
      '-Rain on Monday.',
    ].join('\n');

    expect(parseBriefing(text)).toEqual({
      headline: 'Clear and warm this afternoon.',
      body: 'A light breeze from the southwest. Cooler after dark.',
      advisories: ['UV is high until 3 PM.', 'Rain on Monday.'],
    });
  });

  test('tolerates a half-streamed response', () => {
    expect(parseBriefing('Clear and wa')).toEqual({
      headline: 'Clear and wa',
      body: '',
      advisories: [],
    });
    expect(parseBriefing('')).toEqual({ headline: '', body: '', advisories: [] });
  });
});

describe('answeredTurns (chat history sent to the model)', () => {
  const { answeredTurns } = require('../src/hooks/useWeatherChat');

  test('keeps answered pairs and drops questions that never got a reply', () => {
    const history = [
      { role: 'user', content: 'Will it rain?' },
      { role: 'assistant', content: 'Not today.' },
      { role: 'user', content: 'Failed question' }, // reply errored and was removed
      { role: 'user', content: 'Stopped question' },
      { role: 'assistant', content: '' }, // stopped before any text
      { role: 'user', content: 'Wind?' },
      { role: 'assistant', content: 'Light breeze.' },
    ];
    expect(answeredTurns(history).map(m => m.content)).toEqual([
      'Will it rain?',
      'Not today.',
      'Wind?',
      'Light breeze.',
    ]);
  });
});
