-- Add JSONB settings column to organizations
ALTER TABLE "Organization" ADD COLUMN "settings" JSONB NULL;