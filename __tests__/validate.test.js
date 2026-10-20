import {
  validateEmail,
  validatePassword,
  validateName,
  validateConfirm,
  collect,
} from '../src/utils/validate';

describe('validateEmail', () => {
  test.each([
    ['', 'Enter your email address.'],
    ['   ', 'Enter your email address.'],
    ['student.example.com', 'This needs an @.'],
    ['student@example', "That doesn't look like a complete address."],
  ])('%p -> %p', (input, message) => {
    expect(validateEmail(input)).toBe(message);
  });

  test('accepts a normal address, ignoring surrounding spaces', () => {
    expect(validateEmail('  student@example.com ')).toBeNull();
  });
});

describe('validatePassword', () => {
  test('requires a value', () => {
    expect(validatePassword('')).toBe('Enter your password.');
  });

  test('only enforces length for new passwords', () => {
    expect(validatePassword('abc')).toBeNull();
    expect(validatePassword('abc', { isNew: true })).toBe('3 more characters needed.');
    expect(validatePassword('abcde', { isNew: true })).toBe('1 more character needed.');
    expect(validatePassword('abcdef', { isNew: true })).toBeNull();
  });
});

test('validateName and validateConfirm', () => {
  expect(validateName('  ')).not.toBeNull();
  expect(validateName('Ada')).toBeNull();
  expect(validateConfirm('secret', '')).toBe('Type the password once more.');
  expect(validateConfirm('secret', 'secrex')).toBe("These two don't match.");
  expect(validateConfirm('secret', 'secret')).toBeNull();
});

test('collect drops empty results', () => {
  expect(collect({ email: null, password: 'Enter your password.' })).toEqual({
    password: 'Enter your password.',
  });
});
