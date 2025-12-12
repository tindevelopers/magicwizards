# Docker Database Setup

## Current Status

✅ **Database is already running via Supabase CLI**

The Supabase CLI manages Docker containers automatically. Your database is currently running at:
- **Database URL**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **API URL**: `http://127.0.0.1:54321`
- **Studio**: `http://127.0.0.1:54323`
- **Inbucket (Email)**: `http://127.0.0.1:54324`

## Two Options for Running the Database

### Option 1: Supabase CLI (Currently Active) ✅

**Recommended** - Provides full Supabase stack (PostgreSQL, PostgREST, Auth, Storage, etc.)

```bash
# Start all services
supabase start

# Check status
supabase status

# Stop services
supabase stop

# Reset database (runs all migrations)
supabase db reset
```

**Services included:**
- PostgreSQL (port 54322)
- PostgREST API (port 54321)
- GoTrue Auth (port 9999)
- Supabase Studio (port 54323)
- Storage API
- Realtime
- Inbucket Email (port 54324)
- Analytics

### Option 2: Standalone PostgreSQL (docker-compose.yml)

Use this if you only need PostgreSQL without Supabase services.

```bash
# Start PostgreSQL only
docker-compose up -d

# Check status
docker-compose ps

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (⚠️ deletes data)
docker-compose down -v
```

**Services included:**
- PostgreSQL (port 54320)
- pgAdmin (port 5050)

**Note:** This uses port 54320 to avoid conflicts with Supabase CLI.

## Quick Reference

### Check What's Running

```bash
# Supabase services
supabase status

# Docker containers
docker ps

# Both
docker ps | grep -E "postgres|supabase"
```

### Access Database

**Using Supabase CLI (current setup):**
```bash
# Connection string
postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Using psql
docker exec -it supabase_db_tinadmin-saas-base psql -U postgres
```

**Using docker-compose:**
```bash
# Connection string (if using docker-compose.yml)
postgresql://postgres:postgres@127.0.0.1:54320/postgres

# Using psql
docker exec -it tinadmin-postgres-standalone psql -U postgres
```

### Run Migrations

**With Supabase CLI:**
```bash
supabase db reset  # Runs all migrations
```

**With docker-compose:**
Migrations in `supabase/migrations/` are automatically applied on first start.

### View Logs

```bash
# Supabase logs
supabase logs

# Docker Compose logs
docker-compose logs -f postgres
```

## Environment Variables

Your `.env.local` should have:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

Get the actual keys from `supabase status`.

## Troubleshooting

### Port Conflicts

If you get port conflicts:
1. Check what's using the port: `lsof -i :54322`
2. Stop Supabase: `supabase stop`
3. Or modify ports in `docker-compose.yml`

### Database Not Starting

```bash
# Check logs
docker-compose logs postgres

# Or for Supabase
supabase logs
```

### Reset Everything

```bash
# Supabase CLI
supabase stop
supabase db reset

# Docker Compose
docker-compose down -v
docker-compose up -d
```

## Recommendation

**Use Supabase CLI** (`supabase start`) because:
- ✅ Full Supabase stack (Auth, Storage, Realtime, etc.)
- ✅ Automatic migration handling
- ✅ Studio UI included
- ✅ Email testing (Inbucket)
- ✅ Better integration with Next.js

Use `docker-compose.yml` only if you need:
- Just PostgreSQL without Supabase features
- More control over Docker containers
- Custom PostgreSQL configuration
