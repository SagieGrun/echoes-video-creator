# Echoes - Bring Your Photos to Life

Transform static photos into animated video memories with AI. Perfect for creating heartfelt gifts that bring tears of joy.

## 🚀 Quick Start

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your actual credentials
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)**

## 🛠 Setup Instructions

### Phase 0: Foundation Setup ✅

The basic project structure is complete. Now you need to set up external services:

### 1. Supabase Setup

1. **Create Supabase Project:**
   ```bash
   # Go to https://supabase.com/dashboard
   # Create new project
   # Copy Project URL and anon key to .env.local
   ```

2. **Run Database Schema:**
   ```sql
   -- Execute in Supabase SQL editor
   -- See supabase/schema.sql (to be created in next phase)
   ```

### 2. Stripe Setup

1. **Create Stripe Account:**
   ```bash
   # Go to https://dashboard.stripe.com
   # Get API keys from developers section
   # Add to .env.local
   ```

2. **Create Products:**
   ```bash
   # Starter Pack: 5 credits - $15
   # Standard Pack: 20 credits - $45  
   # Premium Pack: 40 credits - $80
   ```

### 3. Runway API Setup

1. **Get Runway API Access:**
   ```bash
   # Apply for API access at runway.com
   # Add API key to .env.local
   ```

### 4. Deployment Setup

1. **Deploy to Vercel:**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Configure Environment Variables:**
   ```bash
   # Add all .env.local variables to Vercel dashboard
   ```

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Homepage
├── components/         # Reusable UI components
├── lib/               # Utilities and service clients
│   └── supabase.ts    # Supabase configuration
├── hooks/             # Custom React hooks
└── types/             # TypeScript interfaces
    └── index.ts       # Main type definitions

memory-bank/           # Project documentation
supabase/             # Database schemas and functions
```

## 🎯 Development Phases

- ✅ **Phase 0**: Foundation Setup (Complete)
- ⏳ **Phase 1**: Free Clip Flow (Next)
- ⏳ **Phase 2**: Full Project Creation  
- ⏳ **Phase 3**: Payments & Credits
- ⏳ **Phase 4**: PLG Mechanics
- ⏳ **Phase 5**: Admin Panel
- ⏳ **Phase 6**: Polish & Deploy

## 🏗 Architecture

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS (PWA)
- **Backend**: Supabase (Database + Auth + Storage + Edge Functions)
- **AI**: Runway Gen-3 Alpha API (~$0.05-0.10/clip)
- **Payments**: Stripe (USD only)
- **Deployment**: Vercel

## 📝 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Runway AI
RUNWAY_API_KEY=your_runway_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📖 Documentation

Complete project documentation is available in the `memory-bank/` directory:

- `projectbrief.md` - Core requirements and goals
- `productContext.md` - User experience and features
- `techContext.md` - Technical implementation details
- `systemPatterns.md` - Architecture patterns
- `activeContext.md` - Current development focus
- `progress.md` - Development progress tracking

## 🎨 Design Principles

- **Simplicity First**: Choose simple solutions over complex features
- **Mobile-First**: Optimized for mobile user experience
- **Emotional UI**: Warm, family-focused design language
- **Progressive Enhancement**: Works without JavaScript, enhanced with it

---

Ready to bring memories to life! 📸✨ 