# System Patterns - Echoes Video Creator

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js PWA   │    │    Supabase      │    │  External APIs  │
│                 │    │                  │    │                 │
│ • React + TS    ├────┤ • PostgreSQL     ├────┤ • Runway API    │
│ • Tailwind CSS  │    │ • Auth + Storage │    │ • Stripe        │
│ • Service Worker│    │ • Edge Functions │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Core Design Patterns

### 1. Credit System Pattern
```typescript
interface CreditTransaction {
  user_id: string
  amount: number        // positive = credit, negative = debit
  type: 'purchase' | 'referral' | 'generation' | 'share'
  reference_id?: string // stripe payment, project id, etc.
}
```

**Implementation**: 
- All credit changes go through audit log
- Balance calculated from transaction sum
- Prevents race conditions and provides audit trail

### 2. Async Job Pattern (AI Generation)
```typescript
interface ClipJob {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  runway_job_id?: string
  error_message?: string
  created_at: timestamp
  completed_at?: timestamp
}
```

**Flow**:
1. Create clip record with 'pending' status
2. Edge Function calls Runway API, updates to 'processing'
3. Frontend polls status every 5 seconds
4. Webhook or polling updates to 'completed'/'failed'

### 3. Pluggable AI Model Pattern
```typescript
interface AIVideoProvider {
  generateClip(imageUrl: string, prompt: string): Promise<JobId>
  getJobStatus(jobId: string): Promise<JobStatus>
  getResultUrl(jobId: string): Promise<string>
}

class RunwayProvider implements AIVideoProvider {
  // Implementation specific to Runway API
}
```

**Benefits**: Easy to swap AI providers without changing application logic

### 4. Progressive Enhancement Pattern
```typescript
// Works without JavaScript (basic upload)
// Enhanced with JavaScript (drag/drop, previews, real-time status)
// PWA features (offline viewing, install prompt)
```

### 5. Mobile-First Responsive Pattern
```css
/* Mobile base styles */
.upload-zone { /* mobile styles */ }

/* Desktop enhancements */
@media (min-width: 768px) {
  .upload-zone { /* desktop additions */ }
}
```

## Data Flow Patterns

### Free Clip Generation Flow
```
User Upload → Supabase Storage → Edge Function → Runway API
     ↓
Generate Status Updates → Frontend Polling → Display Result
     ↓
Watermark Overlay → Download/Share CTA → Signup Required
```

### Paid Project Flow
```
Auth Required → Credit Check → Multiple Uploads → Batch Generation
     ↓
Edit Interface → Reorder/Delete/Regenerate → Music Selection
     ↓
Final Assembly → Payment (if needed) → Download Without Watermark
```

### Payment Flow
```
Stripe Checkout → Webhook → Credit Addition → Transaction Log
     ↓
Real-time Balance Update → UI Refresh → Feature Unlock
```

## Component Architecture

### Page-Level Components
- `HomePage`: Landing page with free clip CTA
- `FreeTryPage`: Single photo upload and generation
- `ProjectPage`: Multi-photo project creation
- `DashboardPage`: User projects and credit balance

### Feature Components
- `PhotoUpload`: Drag/drop with preview
- `ClipPreview`: Video player with watermark overlay
- `CreditBalance`: Real-time balance display
- `GenerationStatus`: Progress indicator with polling
- `MusicSelector`: Track selection with preview
- `VideoAssembly`: Final compilation interface

### Utility Patterns
- `useCredits()`: Hook for credit balance and transactions
- `useGeneration()`: Hook for job status polling
- `useAuth()`: Supabase auth wrapper
- `useStorage()`: File upload utilities

## Security Patterns

### Row Level Security (RLS)
```sql
-- Users can only access their own data
CREATE POLICY user_isolation ON projects
  FOR ALL USING (auth.uid() = user_id);

-- Admins can access everything
CREATE POLICY admin_access ON projects
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

### File Access Control
```typescript
// Generate signed URLs for temporary access
const { data } = await supabase.storage
  .from('clips')
  .createSignedUrl(filePath, 3600) // 1 hour expiry
```

### API Security
```typescript
// Edge Functions validate user and credits
const { data: user } = await supabase.auth.getUser(jwt)
if (!user || user.credit_balance < 1) {
  return new Response('Insufficient credits', { status: 402 })
}
```

## Error Handling Patterns

### Progressive Error Recovery
1. **Network Errors**: Retry with exponential backoff
2. **Generation Failures**: Allow regeneration (up to 3 times)
3. **Payment Failures**: Clear error messages + retry options
4. **File Upload Errors**: Compress and retry, fallback options

### User-Friendly Error Messages
```typescript
const errorMessages = {
  'insufficient_credits': 'You need more credits to generate this clip',
  'generation_failed': 'Something went wrong. Try regenerating this clip',
  'upload_failed': 'Upload failed. Please check your connection and try again'
}
```

## Performance Patterns

### Lazy Loading
- Components loaded on demand
- Images with blur placeholders
- Progressive video loading

### Caching Strategy
- Static assets cached aggressively
- API responses cached for 5 minutes
- Generated clips cached until cleanup

### Mobile Optimization
- Image compression before upload
- Progressive video streaming
- Offline viewing for generated content 