/**
 * Canonical domain — single source of truth.
 * Set NEXT_PUBLIC_SITE_URL in .env.local / Vercel to override.
 * No trailing slash.
 */
export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sufincaraiz.com').replace(/\/$/, '')
