#!/bin/bash

# Start Supabase Local Development
echo "🚀 Starting Supabase local development..."
supabase start

# Wait for Supabase to be ready
echo "⏳ Waiting for Supabase to be ready..."
sleep 5

# Display Supabase status
echo ""
echo "📊 Supabase Status:"
supabase status

# Start Next.js dev server
echo ""
echo "🚀 Starting Next.js dev server..."
npm run dev




