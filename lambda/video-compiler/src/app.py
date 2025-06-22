import json
import os
import subprocess
import tempfile
import urllib.request
from pathlib import Path
import boto3
from supabase import create_client, Client
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
ssm_client = boto3.client('ssm')
environment = os.environ.get('ENVIRONMENT', 'prod')

def get_parameter(name):
    """Get parameter from AWS Systems Manager Parameter Store"""
    try:
        response = ssm_client.get_parameter(
            Name=f"/echoes/{environment}/supabase/{name}",
            WithDecryption=True
        )
        return response['Parameter']['Value']
    except Exception as e:
        logger.error(f"Failed to get parameter {name}: {str(e)}")
        raise

# Initialize Supabase client with fallback
try:
    SUPABASE_URL = get_parameter('url')
    SUPABASE_SERVICE_ROLE_KEY = get_parameter('service_role_key')
    logger.info("Successfully loaded credentials from Parameter Store")
except Exception as e:
    logger.warning(f"Failed to load from Parameter Store: {e}")
    # Fallback to environment variables
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise Exception("Supabase credentials not found in Parameter Store or environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def lambda_handler(event, context):
    """
    Main Lambda handler for video compilation
    
    Expected input:
    {
        "user_id": "uuid",
        "clips": [
            {
                "id": "clip_id",
                "video_file_path": "path/to/video.mp4",
                "order": 1
            }
        ],
        "music": {
            "file_path": "path/to/music.mp3",
            "volume": 0.5
        },
        "settings": {
            "transition_type": "fade",
            "transition_duration": 1.0
        }
    }
    """
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        logger.info(f"Processing video compilation request: {body}")
        
        # Extract parameters
        user_id = body.get('user_id')
        clips = body.get('clips', [])
        music = body.get('music', {})
        settings = body.get('settings', {})
        
        logger.info(f"Request parameters: user_id={user_id}, clips_count={len(clips)}, music={music}, settings={settings}")
        
        if not user_id or not clips:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required parameters: user_id and clips'})
            }
        
        # Validate clips have video_file_path
        valid_clips = []
        for clip in clips:
            if clip.get('video_file_path'):
                valid_clips.append(clip)
                logger.info(f"Valid clip: {clip['id']} -> {clip['video_file_path']}")
            else:
                logger.warning(f"Skipping clip {clip.get('id', 'unknown')} - no video_file_path")
        
        if not valid_clips:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No clips with valid video_file_path found'})
            }
        
        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Download clips from Supabase storage
            clip_files = []
            for i, clip in enumerate(sorted(valid_clips, key=lambda x: x.get('order', 0))):
                clip_path = temp_path / f"clip_{i:03d}.mp4"
                download_from_supabase_storage(clip['video_file_path'], clip_path)
                clip_files.append(str(clip_path))
            
            # Download music if provided
            music_file = None
            if music and music.get('file_path'):
                music_file = temp_path / "music.mp3"
                download_from_supabase_storage(music['file_path'], music_file)
            
            # Compile video
            output_file = temp_path / "final_video.mp4"
            compile_video(
                clip_files=clip_files,
                music_file=str(music_file) if music_file else None,
                output_file=str(output_file),
                settings=settings,
                music_volume=music.get('volume', 0.3) if music else 0.3
            )
            
            # Upload result to Supabase storage
            final_video_path = f"final_videos/{user_id}/{context.aws_request_id}.mp4"
            upload_to_supabase_storage(str(output_file), final_video_path)
            
            # Save record to database
            final_video_record = {
                'user_id': user_id,
                'file_path': final_video_path,
                'selected_clips': [clip['id'] for clip in valid_clips],
                'music_track_id': music.get('id') if music and music.get('id') else None,
                'transition_type': settings.get('transition_type', 'fade'),
                'music_volume': music.get('volume', 0.3) if music else None,
                'status': 'completed'
            }
            
            result = supabase.table('final_videos').insert(final_video_record).execute()
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Video compilation completed successfully',
                    'video_id': result.data[0]['id'],
                    'video_file_path': final_video_path
                })
            }
            
    except Exception as e:
        logger.error(f"Error in video compilation: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Video compilation failed: {str(e)}'})
        }

def download_from_supabase_storage(file_path: str, local_path: Path):
    """Download file from Supabase storage to local path"""
    try:
        logger.info(f"Attempting to download: {file_path}")
        
        # Get signed URL for download
        response = supabase.storage.from_('private-photos').create_signed_url(file_path, 3600)  # 1 hour expiry
        logger.info(f"Signed URL response: {response}")
        
        if not response.get('signedURL'):
            # Check if there's an error in the response
            if 'error' in response:
                raise Exception(f"Supabase storage error for {file_path}: {response['error']}")
            else:
                raise Exception(f"Failed to get signed URL for {file_path}: {response}")
        
        # Download file
        urllib.request.urlretrieve(response['signedURL'], local_path)
        logger.info(f"Successfully downloaded {file_path} to {local_path}")
        
    except Exception as e:
        logger.error(f"Failed to download {file_path}: {str(e)}")
        raise

def upload_to_supabase_storage(local_path: str, storage_path: str):
    """Upload file from local path to Supabase storage"""
    try:
        with open(local_path, 'rb') as file:
            response = supabase.storage.from_('final-videos').upload(
                storage_path, 
                file,
                {
                    "content-type": "video/mp4"
                }
            )
            
            # Check if upload was successful
            # The response object structure may vary, so handle both cases
            if hasattr(response, 'error') and response.error:
                raise Exception(f"Upload failed: {response.error}")
            elif hasattr(response, 'get') and response.get('error'):
                raise Exception(f"Upload failed: {response['error']}")
            
        logger.info(f"Uploaded {local_path} to {storage_path}")
        
    except Exception as e:
        logger.error(f"Failed to upload to {storage_path}: {str(e)}")
        raise

def compile_video(clip_files: list, music_file: str, output_file: str, settings: dict, music_volume: float = 0.3):
    """Mock video compilation - FFmpeg not available yet"""
    try:
        logger.info(f"Mock video compilation with {len(clip_files)} clips")
        logger.info(f"Settings: {settings}")
        logger.info(f"Music file: {music_file}")
        
        # For now, just copy the first clip as the output
        # This is a temporary solution until we set up FFmpeg properly
        if clip_files:
            import shutil
            shutil.copy2(clip_files[0], output_file)
            logger.info(f"Mock compilation: copied {clip_files[0]} to {output_file}")
        else:
            # Create a dummy file
            with open(output_file, 'wb') as f:
                f.write(b'Mock video content')
            logger.info("Mock compilation: created dummy video file")
        
        logger.info("Mock video compilation completed successfully")
        
    except Exception as e:
        logger.error(f"Error in mock video compilation: {str(e)}")
        raise 