# Local Development Setup

## Starting Services

### Option 1: Using the Start Script

```bash
./scripts/start-local.sh
```

### Option 2: Manual Start

#### 1. Start Supabase Local Development

```bash
supabase start
```

This will:
- Start Docker containers for Supabase (PostgreSQL, PostgREST, GoTrue, etc.)
- Run all migrations
- Set up the local database

**Supabase will be available at:**
- API URL: `http://localhost:54321`
- DB URL: `postgresql://postgres:postgres@localhost:54322/postgres`
- Studio URL: `http://localhost:54323`

#### 2. Start Next.js Dev Server

```bash
npm run dev
```

**Next.js will be available at:**
- `http://localhost:3000`

## Checking Status

### Check Supabase Status

```bash
supabase status
```

### Check Docker Containers

```bash
docker ps | grep supabase
```

### Check Next.js

Visit `http://localhost:3000` in your browser.

## Stopping Services

### Stop Supabase

```bash
supabase stop
```

### Stop Next.js

Press `Ctrl+C` in the terminal running the dev server.

## Environment Variables

Make sure your `.env.local` file has the correct Supabase local URLs:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Get these values by running:
```bash
supabase status
```

## Troubleshooting

### Supabase won't start

1. Check if Docker is running:
   ```bash
   docker ps
   ```

2. Check if ports are already in use:
   ```bash
   lsof -i :54321  # API port
   lsof -i :54322  # DB port
   ```

3. Reset Supabase:
   ```bash
   supabase stop
   supabase start
   ```

### Next.js won't start

1. Check if port 3000 is in use:
   ```bash
   lsof -i :3000
   ```

2. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```

### Database migrations not applied

```bash
supabase db reset
```

This will reset the database and apply all migrations.

