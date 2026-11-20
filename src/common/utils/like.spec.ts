import { containsPattern } from './like';

describe('containsPattern', () => {
  it('wraps the term in %', () => {
    expect(containsPattern('leon')).toBe('%leon%');
  });

  it('escapes %, _ and backslash so they match literally', () => {
    expect(containsPattern('50%')).toBe('%50\\%%');
    expect(containsPattern('a_b')).toBe('%a\\_b%');
    expect(containsPattern('c:\\x')).toBe('%c:\\\\x%');
  });
});
