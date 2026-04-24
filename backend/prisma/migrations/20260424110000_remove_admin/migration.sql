-- Drop admin_alerts table
DROP TABLE IF EXISTS "admin_alerts";

-- Remove role and isBlocked columns from users
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
ALTER TABLE "users" DROP COLUMN IF EXISTS "isBlocked";

-- Drop enums
DROP TYPE IF EXISTS "UserRole";
DROP TYPE IF EXISTS "AlertSeverity";
