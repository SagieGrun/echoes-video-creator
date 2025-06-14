# Product Context - Echoes Video Creator

## Problem Statement
- Static photos lack emotional impact in digital sharing
- Creating video content from photos is technically complex
- Existing solutions are either too expensive or low quality
- No simple way to create personalized video gifts from memories

## Solution
An AI-powered platform that transforms static photos into animated clips and compiles them into emotional videos with music.

## User Journey

### Free User Flow (Auth-First)
1. **Landing Page**: Emotional messaging + "Try a free animated clip"
2. **Sign Up**: Google OAuth authentication required
3. **Upload**: Single photo upload (drag/drop) 
4. **Generation**: AI creates 5-second animated clip (uses 1 free credit)
5. **Preview**: Full quality result with original image intro (0.5s)
6. **Conversion Points**: 
   - Create more clips requires credit purchase
   - Full video creation unlocked
   - Referral system for additional credits

### Paid User Flow (Post-Signup)
1. **Project Wizard**: Upload multiple photos (up to 40)
2. **Generation**: AI creates clips for each photo
3. **Editing**: Reorder/Delete/Regenerate (3 max per project)
4. **Music**: Choose from royalty-free tracks
5. **Preview**: Full video with music
6. **Payment**: Stripe checkout if insufficient credits
7. **Download**: Final MP4 without watermark

## Key Features

### Core MVP Features
- Google OAuth authentication
- Photo upload with drag/drop interface
- AI clip generation with status tracking
- Watermarked preview for free users
- Credit system with balance tracking
- Music selection from curated tracks
- Video preview and final export
- Regeneration system (3 max per project)

### PLG Mechanics
- **Referral System**: Unique codes, +5 credits for both parties
- **Share-to-Earn**: +1 credit for social sharing with tag
- **Free Hook**: 1 free credit upon signup to demonstrate value

### Pricing Strategy
- **Starter Pack**: 5 credits — $15 (~$3.00/credit)
- **Standard Pack**: 20 credits — $45 (~$2.25/credit)  
- **Premium Pack**: 40 credits — $80 (~$2.00/credit)
- **Top-ups**: Available post-purchase at discounted rates

## User Experience Principles
- **Emotional First**: Every interaction should feel magical
- **Mobile Optimized**: Smooth experience on mobile devices
- **Instant Gratification**: Show progress and results quickly
- **Minimal Friction**: Reduce steps to value realization
- **Trust Building**: Professional quality and reliable generation

## Current Implementation Status ✅ READY FOR PRODUCTION

### Core Features Implemented
- ✅ **Google OAuth authentication** - Working with secure callback
- ✅ **Photo upload with drag/drop** - Private storage with signed URLs
- ✅ **AI clip generation** - Runway ML Gen-4 Turbo via Edge Functions
- ✅ **Status tracking** - Real-time progress updates with superior debugging
- ✅ **Credit system** - Balance tracking and transaction logging
- ✅ **Admin configuration** - System prompts, credit packs, model settings

### Technical Foundation Complete
- ✅ **Superior debugging experience** - Original goal achieved
- ✅ **Scalable architecture** - Edge Functions with auto-scaling
- ✅ **Security** - Proper authentication and RLS protection
- ✅ **Build process** - Verified TypeScript compilation and deployment

### Ready for Next Phase
- **Production deployment** to validate user experience
- **Payment integration** for credit pack purchases  
- **Growth features** for referrals and sharing mechanics