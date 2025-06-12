# Technical Context - Echoes Video Creator

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **PWA**: Service worker + manifest for mobile app experience
- **State Management**: React hooks + Context API
- **UI Components**: Headless UI + custom components

### Backend
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth with Google OAuth
- **File Storage**: Supabase Storage
- **API**: Supabase Edge Functions
- **Real-time**: Supabase subscriptions for status updates

### External Services
- **AI Video Generation**: Runway Gen-3 Alpha API
- **Payments**: Stripe (USD, credit cards)
- **Deployment**: Vercel (frontend) + Supabase (backend)
- **Analytics**: Built-in Supabase analytics (simple)

## Architecture Decisions

### AI Service Choice: Runway Gen-3 Alpha
- **Cost**: ~$0.05-0.10 per 4-second clip (under $0.25 target)
- **Quality**: Production-ready photo animation
- **Integration**: REST API with webhook support
- **Generation Time**: 60-120 seconds (acceptable for async)

### Video Processing: Browser-Based
- **Approach**: Client-side video assembly using Web APIs
- **Benefits**: No server-side FFmpeg, reduced complexity
- **Implementation**: MediaRecorder API + Canvas for compilation
- **Format**: MP4 export via blob URLs

### Queue System: Database Polling
- **Method**: Supabase Edge Functions + status columns
- **Polling**: Frontend checks generation status every 5 seconds
- **Benefits**: No external queue service, simple to debug
- **Scalability**: Sufficient for MVP, can upgrade later

### File Management
- **Storage**: Supabase Storage with signed URLs
- **Cleanup**: 7-day TTL via database triggers
- **Organization**: User folders with UUID-based file names
- **Protection**: Watermarked previews, signed download URLs

## Development Environment

### Required Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RUNWAY_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Database Schema
- **users**: id, email, credit_balance, referral_code, created_at
- **projects**: id, user_id, created_at, status, music_id, title
- **clips**: id, project_id, image_url, video_url, prompt, status, regen_count
- **payments**: user_id, stripe_id, credits_purchased, created_at
- **referrals**: referrer_id, referred_id, status, credits_awarded

### Deployment Strategy
- **Frontend**: Vercel with automatic GitHub deployments
- **Database**: Supabase managed PostgreSQL
- **Edge Functions**: Deployed via Supabase CLI
- **Domain**: Custom domain setup for production

## Performance Targets (MVP)
- **Page Load**: < 3 seconds on mobile
- **Upload Speed**: Progressive upload with compression
- **Generation Status**: Real-time updates via polling
- **Video Preview**: Smooth playback on mobile devices

## Security Considerations
- **RLS Policies**: Row-level security for all user data
- **File Access**: Signed URLs with expiration
- **API Keys**: Server-side only, never exposed to client
- **Payment Security**: Stripe handles all card processing
- **Watermark Protection**: Canvas overlay, disabled right-click

## Scalability Path
- **Current**: Supports 50 concurrent users easily
- **Phase 2**: Add Redis queue, CDN for video delivery
- **Phase 3**: Separate video processing service
- **Phase 4**: Multi-region deployment 