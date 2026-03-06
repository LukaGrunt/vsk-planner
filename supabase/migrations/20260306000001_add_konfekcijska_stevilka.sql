-- Add konfekcijska_stevilka (clothing size) field to both tables
ALTER TABLE members ADD COLUMN IF NOT EXISTS konfekcijska_stevilka text;
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS konfekcijska_stevilka text;
