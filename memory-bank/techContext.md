# Technical Context - Echoes Video Creator

## Stack Overview

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase Auth UI

### Backend
- Supabase (PostgreSQL + Auth + Storage)
- Edge Functions (Deno)
- Stripe (Payments)

### AI Provider
- Pluggable architecture
- Starting with Runway
- Easy to swap providers

## Database Schema

```sql
-- Users (handled by Supabase Auth)
create table public.user_profiles (
  id uuid references auth.users primary key,
  credit_balance integer not null default 1,
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

## API Routes

### Authentication
- POST /auth/google/callback
- GET /auth/user

### Projects
- GET /api/projects
- POST /api/projects
- GET /api/projects/:id
- PUT /api/projects/:id

### Clips
- POST /api/clips
- GET /api/clips/:id
- PUT /api/clips/:id/approve
- DELETE /api/clips/:id

### Credits
- GET /api/credits/balance
- POST /api/credits/purchase
- POST /api/credits/redeem-referral

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

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm
- Supabase CLI
- Stripe CLI (optional)

### Local Development
```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local

# Start development server
pnpm dev
```

## Deployment

### Production Requirements
- Vercel/Netlify for frontend
- Supabase project
- Stripe account
- AI provider account

### CI/CD
- GitHub Actions
- Automated testing
- Environment promotion
- Database migrations 