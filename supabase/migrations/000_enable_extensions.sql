-- =====================================================
-- ENABLE REQUIRED POSTGRESQL EXTENSIONS
-- =====================================================
-- This migration must run FIRST before any other migrations
-- that use cryptographic functions or UUID generation
-- =====================================================

-- Enable pgcrypto extension for password hashing and cryptographic functions
-- Required by migrations that use crypt() and gen_salt() functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable uuid-ossp extension for UUID generation functions
-- Required by migrations that use uuid_generate_v4() or similar
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable http extension if needed for external HTTP requests
-- CREATE EXTENSION IF NOT EXISTS http;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POSTGRESQL EXTENSIONS ENABLED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Extensions enabled:';
  RAISE NOTICE '  - pgcrypto (for password hashing)';
  RAISE NOTICE '  - uuid-ossp (for UUID generation)';
  RAISE NOTICE '';
  RAISE NOTICE 'These extensions are required for:';
  RAISE NOTICE '  - Creating users with encrypted passwords';
  RAISE NOTICE '  - Generating UUIDs for primary keys';
  RAISE NOTICE '========================================';
END $$;
