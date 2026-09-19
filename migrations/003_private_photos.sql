BEGIN;
ALTER TABLE profile_photo_uploads ADD COLUMN IF NOT EXISTS storage_access text NOT NULL DEFAULT 'public';
ALTER TABLE profile_photo_uploads ADD COLUMN IF NOT EXISTS legacy_url text;
ALTER TABLE profile_photo_uploads ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE profile_photo_uploads ADD COLUMN IF NOT EXISTS purged_at timestamptz;
ALTER TABLE profile_photo_uploads ADD COLUMN IF NOT EXISTS public_deleted_at timestamptz;
UPDATE profile_photo_uploads SET legacy_url = url WHERE storage_access = 'public' AND legacy_url IS NULL AND url IS NOT NULL;

ALTER TABLE shared_portfolios ADD COLUMN IF NOT EXISTS photo_id uuid REFERENCES profile_photo_uploads(id);
ALTER TABLE shared_portfolios ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
UPDATE shared_portfolios s SET photo_id = p.id
FROM profile_photo_uploads p
WHERE s.photo_id IS NULL AND s.session_id = p.session_id AND s.portfolio->>'avatarUrl' = p.legacy_url;
ALTER TABLE shared_portfolios DROP CONSTRAINT IF EXISTS shared_portfolios_session_id_content_hash_key;
CREATE UNIQUE INDEX IF NOT EXISTS shared_portfolios_active_content
  ON shared_portfolios (session_id, content_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS shared_portfolios_photo ON shared_portfolios(photo_id) WHERE revoked_at IS NULL;
COMMIT;
