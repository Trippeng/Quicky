-- Add settings column to Organization as JSONB
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "settings" JSONB;
