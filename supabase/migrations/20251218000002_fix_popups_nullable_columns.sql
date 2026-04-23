-- Make message and link columns nullable in popups table
-- These columns are not used by the current app but have NOT NULL constraints

ALTER TABLE popups ALTER COLUMN message DROP NOT NULL;
ALTER TABLE popups ALTER COLUMN link DROP NOT NULL;
