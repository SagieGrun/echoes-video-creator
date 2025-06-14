# Technical Context - Echoes Video Creator

## Stack Overview (Updated - Edge Functions Architecture)

### Frontend (Hybrid Next.js)
- Next.js 14 (Hybrid: Static + Serverless)
- TypeScript
- Tailwind CSS
- React Components

### Backend (Serverless)
- Supabase Edge Functions (Deno runtime)
- Supabase PostgreSQL + RLS
- Supabase Auth (Google OAuth)
- Supabase Storage (Private buckets)

### External Services
- Runway ML API (Gen-4 Turbo)
- Stripe (Payments)

### Key Migration: Next.js API Routes → Edge Functions ✅ COMPLETED
**Problem Solved**: Debugging and monitoring difficulties with Next.js API routes
**Solution**: Supabase Edge Functions with built-in logging and error tracking
**Status**: Migration completed successfully with superior debugging experience achieved

### Deployment Strategy: Hybrid Next.js Model 
**Why Not Static Export**: OAuth callback requires server-side execution
**Solution**: Hybrid deployment with static pages + serverless functions
**Platform**: Vercel/Netlify with automatic optimization

## Database Schema

```sql
-- Users (handled by Supabase Auth)
create table public.user_profiles (
  id uuid references auth.users primary key,
  credit_balance integer not null default 1, -- 1 free credit upon signup
  referral_code text unique,
  referred_by uuid references auth.users,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Projects
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  title text,
  music_url text,
  status text not null default 'in_progress',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Clips
create table public.clips (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects not null,
  image_url text not null,
  video_url text,
  status text not null default 'generating',
  approved boolean default false,
  order integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Credit Transactions
create table public.credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  amount integer not null,
  type text not null,
  reference_id text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Payments
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  stripe_session_id text unique not null,
  amount_cents integer not null,
  credits_purchased integer not null,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

## Storage Structure

```
private/
  ├── images/
  │   └── {user_id}/
  │       └── {project_id}/
  │           └── {clip_id}.{ext}
  └── clips/
      └── {user_id}/
          └── {project_id}/
              └── {clip_id}.mp4
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AI Provider
RUNWAY_API_KEY=
ACTIVE_AI_PROVIDER=runway
```

## API Architecture (Updated - Edge Functions)

### Supabase Edge Functions
- `clip-generation` - Generate clips using Runway API
- `clip-status` - Check generation progress and status
- `clip-details` - Retrieve clip information and metadata

### Frontend Direct API Calls
- Supabase Auth - Authentication handled client-side
- Supabase Database - Direct queries with RLS protection
- Supabase Storage - File uploads and downloads

### Successfully Migrated to Edge Functions ✅ COMPLETED
- ✅ `/api/clips/generate` → Edge Function `clip-generation` (deployed)
- ✅ `/api/clips/[id]/status` → Edge Function `clip-status` (deployed)
- ✅ `/api/clips/[id]` → Edge Function `clip-details` (deployed)

### Remaining Next.js API Routes (Intentionally Kept)
- `/api/admin/auth` - Simple password validation
- `/api/admin/credits` - Credit pack management  
- `/api/admin/system-prompt` - System prompt configuration
- `/api/admin/models` - Model provider configuration
**Rationale**: Simple CRUD operations that don't need complex debugging

### Admin Panel
- Frontend remains in Next.js with hybrid deployment
- Simple API routes for basic admin operations
- Password protection and direct Supabase operations

## Security Measures

### Row Level Security
```sql
-- All tables have RLS enabled
alter table public.projects enable row level security;
alter table public.clips enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.payments enable row level security;

-- Users can only access their own data
create policy "users can access own data"
  on public.projects
  for all
  using (auth.uid() = user_id);
```

### Storage Security
- All buckets are private
- Signed URLs for temporary access
- User-specific folders

## Performance Considerations

### Frontend
- Image optimization
- Lazy loading components
- Sequential clip loading
- Preload next clip

### Backend
- Edge Functions for low latency
- Efficient polling intervals
- Caching strategies
- Connection pooling

## Development Setup (Updated - Edge Functions)

### Prerequisites
- Node.js 18+
- pnpm
- Supabase CLI (required for Edge Functions)
- Deno (for Edge Function development)

### Local Development
```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local

# Start frontend development server
pnpm dev

# Start Edge Functions locally (separate terminal)
supabase functions serve

# Deploy Edge Functions
supabase functions deploy clip-generation
supabase functions deploy clip-status
supabase functions deploy clip-details
```

### Development Experience Improvements
**Before (Next.js API Routes):**
- ❌ Limited debugging (console.log only)
- ❌ No real-time error tracking
- ❌ Difficult to monitor API performance
- ❌ Complex deployment requirements

**After (Supabase Edge Functions):**
- ✅ Real-time logging dashboard
- ✅ Structured error tracking with stack traces
- ✅ Performance monitoring and metrics
- ✅ Simple deployment with CLI
- ✅ Auto-scaling and reliability

## Deployment

### Production Requirements ✅ READY
- Vercel/Netlify for hybrid Next.js deployment
- Supabase project (configured with Edge Functions deployed)
- Stripe account (for payment integration)
- Runway API account (configured and working)

### CI/CD
- GitHub Actions
- Automated testing
- Environment promotion
- Database migrations

## Migration Success Summary ✅ COMPLETED

### Problems Solved
- ❌ **Poor Debugging** → ✅ **Real-time Dashboard Monitoring**
- ❌ **Limited Error Tracking** → ✅ **Structured Error Logging with Stack Traces**
- ❌ **No Performance Monitoring** → ✅ **Comprehensive Request Tracking**
- ❌ **Deployment Complexity** → ✅ **Simple Edge Function Deployment**
- ❌ **Development Frustration** → ✅ **Confident API Development**

### Current Architecture Status
- **✅ Edge Functions**: 3 deployed and operational (clip-generation, clip-status, clip-details)
- **✅ Frontend**: Complete Next.js hybrid app with all features working
- **✅ Authentication**: Secure OAuth flow with server-side callback
- **✅ Database**: All operations with RLS protection
- **✅ Storage**: Private file uploads with signed URLs
- **✅ Admin Panel**: Configuration management working
- **✅ Build Process**: TypeScript compilation and production builds verified

### Ready for Production
- **Core Functionality**: Complete clip generation workflow
- **Security**: Proper authentication and authorization
- **Performance**: Auto-scaling serverless architecture
- **Monitoring**: Superior debugging and error tracking
- **Reliability**: Proven deployment model with build verification

**🎯 MISSION ACCOMPLISHED**: The original debugging frustration has been completely resolved through successful migration to Supabase Edge Functions with superior monitoring capabilities.