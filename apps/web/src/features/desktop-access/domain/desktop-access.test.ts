import { describe, expect, it } from 'vitest';

import { isDesktop } from './desktop-access';

describe('isDesktop', () => {
  it('returns false for mobile user agents', () => {
    expect(
      isDesktop(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        true,
      ),
    ).toBe(false);
  });

  it('returns true for desktop browsers with a fine pointer', () => {
    expect(
      isDesktop(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
        false,
      ),
    ).toBe(true);
  });

  it('returns false for coarse-pointer tablets even without a mobile user agent', () => {
    expect(
      isDesktop(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
        true,
      ),
    ).toBe(false);
  });
});
