-- ServDesk MVP Database Seed
-- Run with: npx wrangler d1 execute servdesk-db --local --file=./src/db/seed.sql
-- For production: npx wrangler d1 execute servdesk-db --remote --file=./src/db/seed.sql

-- Note: This seed assumes Better Auth has created a user with ID 'seed-super-admin-001'
-- Update the user_id to match the actual Better Auth user ID in production

-- Insert default SUPER_ADMIN user profile (if not exists)
INSERT OR IGNORE INTO user_profiles (
  user_id,
  role,
  is_active,
  failed_login_attempts,
  created_at,
  updated_at
) VALUES (
  'seed-super-admin-001',
  'SUPER_ADMIN',
  1,
  0,
  unixepoch(),
  unixepoch()
);

-- Insert sample customer for development (optional, remove for production)
INSERT OR IGNORE INTO customers (
  id,
  email,
  name,
  organization,
  ticket_count,
  created_at,
  updated_at
) VALUES (
  'seed-customer-001',
  'customer@example.com',
  'Sample Customer',
  'Example Corp',
  0,
  unixepoch(),
  unixepoch()
);
