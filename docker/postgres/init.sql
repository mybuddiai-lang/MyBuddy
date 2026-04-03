-- Grant full access to buddi user on the public schema
GRANT ALL ON SCHEMA public TO buddi;
ALTER SCHEMA public OWNER TO buddi;
GRANT ALL PRIVILEGES ON DATABASE buddi_db TO buddi;

-- Create extensions schema for pgvector and uuid-ossp
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT ALL ON SCHEMA extensions TO buddi;

-- Install extensions
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
