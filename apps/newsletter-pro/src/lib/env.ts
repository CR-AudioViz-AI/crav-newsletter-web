import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    CRAV_SSO_ISSUER: z.string().url().optional(),
    CRAV_SSO_JWKS_URL: z.string().url().optional(),
    CRAV_SSO_CLIENT_ID: z.string().optional(),
    CRAV_SSO_CLIENT_SECRET: z.string().optional(),

    NEXTAUTH_SECRET: z.string().min(32).optional(),
    NEXTAUTH_URL: z.string().url().optional(),

    AUTH_MODE: z.enum(["sso", "standalone", "hybrid"]).default("hybrid"),

    CREDITS_API_URL: z.string().url().optional(),
    CREDITS_API_KEY: z.string().optional(),

    AWS_SES_REGION: z.string().optional(),
    AWS_SES_ACCESS_KEY_ID: z.string().optional(),
    AWS_SES_SECRET_ACCESS_KEY: z.string().optional(),

    POSTMARK_API_KEY: z.string().optional(),
    SENDGRID_API_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_ANALYTICS_URL: z.string().url().optional(),
    NEXT_PUBLIC_ANALYTICS_KEY: z.string().optional(),
    NEXT_PUBLIC_DASHBOARD_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,

    CRAV_SSO_ISSUER: process.env.CRAV_SSO_ISSUER,
    CRAV_SSO_JWKS_URL: process.env.CRAV_SSO_JWKS_URL,
    CRAV_SSO_CLIENT_ID: process.env.CRAV_SSO_CLIENT_ID,
    CRAV_SSO_CLIENT_SECRET: process.env.CRAV_SSO_CLIENT_SECRET,

    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,

    AUTH_MODE: process.env.AUTH_MODE,

    CREDITS_API_URL: process.env.CREDITS_API_URL,
    CREDITS_API_KEY: process.env.CREDITS_API_KEY,

    AWS_SES_REGION: process.env.AWS_SES_REGION,
    AWS_SES_ACCESS_KEY_ID: process.env.AWS_SES_ACCESS_KEY_ID,
    AWS_SES_SECRET_ACCESS_KEY: process.env.AWS_SES_SECRET_ACCESS_KEY,

    POSTMARK_API_KEY: process.env.POSTMARK_API_KEY,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,

    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ANALYTICS_URL: process.env.NEXT_PUBLIC_ANALYTICS_URL,
    NEXT_PUBLIC_ANALYTICS_KEY: process.env.NEXT_PUBLIC_ANALYTICS_KEY,
    NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
