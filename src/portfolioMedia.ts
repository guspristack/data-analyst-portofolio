import portrait from './images/portrait-dimas.webp';

export type SocialLink = { platform: 'instagram' | 'linkedin' | 'github'; url?: string };
export type PortfolioMedia = { portrait: string; socials: readonly SocialLink[] };

export const portfolioMedia = {
  dimas: { portrait, socials: [{ platform: 'instagram' }, { platform: 'linkedin' }, { platform: 'github' }] },
} satisfies Record<string, PortfolioMedia>;
