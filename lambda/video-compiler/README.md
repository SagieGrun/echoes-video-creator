# Echoes Video Compilation Lambda Function

This Lambda function handles video compilation using FFmpeg to combine multiple video clips with background music and transitions.

## 🚀 Quick Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- SAM CLI installed
- Supabase project with service role key

### Step 1: Deploy (Interactive Setup)
```bash
cd lambda/video-compiler
./deploy.sh
```

The deployment script will:
1. **Prompt you for Supabase credentials** (URL and Service Role Key)
2. **Securely store them** in AWS Parameter Store (encrypted)
3. **Deploy the Lambda function** with proper permissions

### Step 3: Update Frontend
After deployment, add the API Gateway endpoint to your `.env.local`:
```
LAMBDA_COMPILE_ENDPOINT=https://your-api-id.execute-api.us-east-1.amazonaws.com/Prod/compile
```

## 📋 What This Function Does

1. **Receives compilation request** with:
   - User ID
   - Selected video clips (with file paths)
   - Background music (optional)
   - Transition settings

2. **Downloads media files** from Supabase storage

3. **Processes video** using FFmpeg:
   - Scales clips to 1920x1080
   - Applies transitions between clips
   - Mixes audio with background music
   - Outputs high-quality MP4

4. **Uploads result** back to Supabase storage

5. **Updates database** with final video record

## 🔧 Technical Details

- **Runtime**: Python 3.11
- **Memory**: 3008 MB (maximum)
- **Timeout**: 15 minutes (maximum)
- **Architecture**: x86_64
- **FFmpeg Layer**: Public layer for video processing

## 🧪 Testing

The function can be tested with a sample payload:
```json
{
  "user_id": "user-uuid",
  "clips": [
    {
      "id": "clip-1",
      "video_file_path": "clips/user/video1.mp4",
      "order": 1
    }
  ],
  "music": {
    "file_path": "music/track.mp3",
    "volume": 0.3
  },
  "settings": {
    "transition_type": "fade",
    "transition_duration": 1.0
  }
}
```

## 🔍 Monitoring

Check CloudWatch logs for:
- Function execution logs
- FFmpeg processing output
- Error details and debugging info

## 💡 Troubleshooting

**Common Issues:**
- **Timeout**: Videos too long or complex - consider shorter clips
- **Memory**: Large files - optimize clip sizes before upload
- **FFmpeg errors**: Check video format compatibility
- **Storage errors**: Verify Supabase permissions and file paths 