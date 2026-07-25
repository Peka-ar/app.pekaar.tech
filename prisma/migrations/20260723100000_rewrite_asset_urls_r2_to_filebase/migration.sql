-- Rewrite any R2 public URLs to Filebase public URLs
-- No R2_PUBLIC_URL was ever configured in .env, so this is a defensive no-op.
-- If there were any URLs containing the old R2 pattern, they'd be migrated here.
UPDATE "Asset"
SET url = REPLACE(url, 'https://pub-', 'https://studiov-assets.s3.filebase.io/')
WHERE url LIKE 'https://pub-%';

UPDATE "Asset"
SET url = REPLACE(url, '.r2.dev', '.s3.filebase.io')
WHERE url LIKE '%.r2.dev%';

-- Update provider audit field for any rows that might have had provider = 'r2'
UPDATE "Asset"
SET provider = 'filebase'
WHERE provider = 'r2';
