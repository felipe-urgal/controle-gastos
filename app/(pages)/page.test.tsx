import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
  findUniqueUser: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  getAuthenticatedUserId: mocks.getAuthenticatedUserId,
}));

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUniqueUser,
    },
  },
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/app/components/pages/home', () => ({
  HomeClient: () => null,
}));

import Page from '@/app/(pages)/page';

afterEach(() => {
  mocks.getAuthenticatedUserId.mockReset();
  mocks.findUniqueUser.mockReset();
  mocks.redirect.mockReset();
});

describe('home session resolution', () => {
  it('redirects an authenticated existing user before rendering the public landing', async () => {
    mocks.getAuthenticatedUserId.mockResolvedValue('user-id');
    mocks.findUniqueUser.mockResolvedValue({ id: 'user-id' });

    await Page();

    expect(mocks.findUniqueUser).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      select: { id: true },
    });
    expect(mocks.redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('renders the public landing when there is no valid session', async () => {
    mocks.getAuthenticatedUserId.mockRejectedValue(new Error('UNAUTHORIZED'));

    const result = await Page();

    expect(result).not.toBeUndefined();
    expect(mocks.findUniqueUser).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('renders the public landing instead of looping when the token references a missing user', async () => {
    mocks.getAuthenticatedUserId.mockResolvedValue('deleted-user-id');
    mocks.findUniqueUser.mockResolvedValue(null);

    const result = await Page();

    expect(result).not.toBeUndefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('does not hide unexpected authentication failures', async () => {
    mocks.getAuthenticatedUserId.mockRejectedValue(new Error('unexpected'));

    await expect(Page()).rejects.toThrow('unexpected');
    expect(mocks.findUniqueUser).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
