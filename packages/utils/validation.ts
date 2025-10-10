import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');

export const urlSchema = z.string().url('Invalid URL');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');

export const uuidSchema = z.string().uuid('Invalid UUID');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export function isEmail(value: string): boolean {
  return emailSchema.safeParse(value).success;
}

export function isUrl(value: string): boolean {
  return urlSchema.safeParse(value).success;
}

export function isPhone(value: string): boolean {
  return phoneSchema.safeParse(value).success;
}

export function isSlug(value: string): boolean {
  return slugSchema.safeParse(value).success;
}

export function isUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

export function isStrongPassword(value: string): boolean {
  return passwordSchema.safeParse(value).success;
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}
