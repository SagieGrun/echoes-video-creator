-- Create users table
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  credit_balance integer default 1,
  referral_code text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create projects table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade,
  title text,
  music_url text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create clips table
create table if not exists public.clips (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  image_url text not null,
  video_url text,
  prompt text,
  status text not null default 'generating' check (status in ('generating', 'ready', 'error')),
  approved boolean default false,
  order integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create credit transactions table
create table if not exists public.credit_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade not null,
  amount integer not null,
  type text not null check (type in ('purchase', 'referral', 'generation', 'share')),
  reference_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create payments table
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade not null,
  stripe_session_id text unique not null,
  amount_cents integer not null,
  credits_purchased integer not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create referrals table
create table if not exists public.referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references public.users on delete cascade not null,
  referred_id uuid references public.users on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.clips enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.payments enable row level security;
alter table public.referrals enable row level security;

-- Users policies
create policy "Users can view their own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own data"
  on public.users for update
  using (auth.uid() = id);

-- Projects policies
create policy "Users can view their own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can create their own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on public.projects for update
  using (auth.uid() = user_id);

-- Clips policies
create policy "Users can view clips from their projects"
  on public.clips for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = clips.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create clips in their projects"
  on public.clips for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = clips.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update clips in their projects"
  on public.clips for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = clips.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Credit transactions policies
create policy "Users can view their own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

create policy "Users can create their own transactions"
  on public.credit_transactions for insert
  with check (auth.uid() = user_id);

-- Payments policies
create policy "Users can view their own payments"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "Users can create their own payments"
  on public.payments for insert
  with check (auth.uid() = user_id);

-- Referrals policies
create policy "Users can view their own referrals"
  on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);

create policy "Users can create referrals"
  on public.referrals for insert
  with check (auth.uid() = referrer_id);

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, referral_code)
  values (
    new.id,
    new.email,
    substr(md5(random()::text), 1, 8)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user(); 