import { describe, expect, it } from 'vitest';

import { shouldCoverPublicLanding } from '@/app/components/pages/home/home-auth-redirect';

describe('shouldCoverPublicLanding', () => {
  it('covers the landing while the session is loading', () => {
    expect(shouldCoverPublicLanding(true, false)).toBe(true);
  });

  it('keeps the landing covered while an authenticated user redirects', () => {
    expect(shouldCoverPublicLanding(false, true)).toBe(true);
  });

  it('shows the public landing only after unauthenticated state is confirmed', () => {
    expect(shouldCoverPublicLanding(false, false)).toBe(false);
  });
});
