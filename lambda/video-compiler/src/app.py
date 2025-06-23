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
                logger.info(f"Music requested: {music}")
                music_file = temp_path / "music.mp3"
                download_music_from_supabase_storage(music['file_path'], music_file)
                
                # Verify music file was downloaded
                if music_file.exists():
                    music_size = music_file.stat().st_size
                    logger.info(f"Music file downloaded successfully: {music_size} bytes")
                else:
                    logger.error("Music file was not downloaded successfully")
                    music_file = None
            else:
                logger.info("No music requested or no file_path provided")
            
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

def download_music_from_supabase_storage(file_path: str, local_path: Path):
    """Download music file from Supabase music-tracks storage bucket"""
    try:
        logger.info(f"Attempting to download music: {file_path}")
        
        # Get signed URL for download from music-tracks bucket
        response = supabase.storage.from_('music-tracks').create_signed_url(file_path, 3600)  # 1 hour expiry
        logger.info(f"Music signed URL response: {response}")
        
        if not response.get('signedURL'):
            # Check if there's an error in the response
            if 'error' in response:
                raise Exception(f"Supabase music storage error for {file_path}: {response['error']}")
            else:
                raise Exception(f"Failed to get signed URL for music {file_path}: {response}")
        
        # Download music file
        urllib.request.urlretrieve(response['signedURL'], local_path)
        logger.info(f"Successfully downloaded music {file_path} to {local_path}")
        
    except Exception as e:
        logger.error(f"Failed to download music {file_path}: {str(e)}")
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

def get_video_duration(video_file: str) -> float:
    """Get video duration in seconds using ffprobe"""
    try:
        cmd = [
            './bin/ffprobe', 
            '-v', 'quiet',
            '-show_entries', 'format=duration',
            '-of', 'csv=p=0',
            video_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0 and result.stdout.strip():
            duration = float(result.stdout.strip())
            logger.info(f"Video duration for {video_file}: {duration} seconds")
            return duration
        else:
            logger.warning(f"Could not get duration for {video_file}, defaulting to 5 seconds")
            return 5.0  # Default duration for clips
            
    except Exception as e:
        logger.warning(f"Error getting video duration: {str(e)}, defaulting to 5 seconds")
        return 5.0

def compile_video(clip_files: list, music_file: str, output_file: str, settings: dict, music_volume: float = 0.3):
    """Compile video using FFmpeg with transitions and music"""
    try:
        logger.info(f"Starting FFmpeg video compilation with {len(clip_files)} clips")
        logger.info(f"Settings: {settings}")
        logger.info(f"Music file: {music_file}")
        
        if not clip_files:
            raise Exception("No clip files provided for compilation")
        
        # Get transition settings
        transition_type = settings.get('transition_type', 'fade')
        transition_duration = float(settings.get('transition_duration', 1.0))
        
        # Build FFmpeg command
        ffmpeg_cmd = build_ffmpeg_command(
            clip_files=clip_files,
            music_file=music_file,
            output_file=output_file,
            transition_type=transition_type,
            transition_duration=transition_duration,
            music_volume=music_volume
        )
        
        logger.info(f"Executing FFmpeg command: {' '.join(ffmpeg_cmd)}")
        
        # Execute FFmpeg with fallback
        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )
        
        if result.returncode != 0:
            logger.error(f"FFmpeg failed with return code {result.returncode}")
            logger.error(f"FFmpeg stderr: {result.stderr}")
            
            # Try fallback: simple concatenation without complex filters
            logger.info("Attempting fallback: simple concatenation")
            fallback_cmd = build_simple_fallback_command(clip_files, music_file, output_file, music_volume)
            logger.info(f"Fallback command: {' '.join(fallback_cmd)}")
            
            fallback_result = subprocess.run(
                fallback_cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout for fallback
            )
            
            if fallback_result.returncode != 0:
                logger.error(f"Fallback also failed: {fallback_result.stderr}")
                raise Exception(f"FFmpeg compilation failed: {result.stderr}")
            else:
                logger.info("Fallback compilation succeeded")
                result = fallback_result
        
        logger.info("FFmpeg video compilation completed successfully")
        logger.info(f"FFmpeg stdout: {result.stdout}")
        
        # Verify output file was created
        if not os.path.exists(output_file):
            raise Exception("Output file was not created by FFmpeg")
        
        file_size = os.path.getsize(output_file)
        logger.info(f"Output file size: {file_size} bytes")
        
        if file_size == 0:
            raise Exception("Output file is empty")
        
    except subprocess.TimeoutExpired:
        logger.error("FFmpeg compilation timed out")
        raise Exception("Video compilation timed out")
    except Exception as e:
        logger.error(f"Error in video compilation: {str(e)}")
        raise


def build_ffmpeg_command(clip_files: list, music_file: str, output_file: str, 
                        transition_type: str, transition_duration: float, music_volume: float):
    """Build FFmpeg command for video compilation with transitions and music"""
    
    cmd = ['./bin/ffmpeg', '-y']  # -y to overwrite output file
    
    # Add input files
    for clip_file in clip_files:
        cmd.extend(['-i', clip_file])
    
    # Add music file if provided
    if music_file and os.path.exists(music_file):
        cmd.extend(['-i', music_file])
        has_music = True
    else:
        has_music = False
    
    # Calculate total video duration for proper fade timing
    if has_music:
        if len(clip_files) == 1:
            # Single clip duration
            video_duration = get_video_duration(clip_files[0])
        else:
            # Multiple clips - sum their durations (approximation)
            video_duration = sum(get_video_duration(clip) for clip in clip_files)
        
        # Calculate fade out start time (1 second before end, minimum at 1 second)
        fade_out_start = max(1.0, video_duration - 1.0)
    
    # Build filter complex for transitions
    if len(clip_files) == 1:
        # Single clip - need to process music with volume, fade, and duration
        if has_music:
            # Apply volume control, fade in/out, and truncate music to video duration
            # Fade in over 1 second, fade out over 1 second from calculated time
            filter_complex = f'[1:a]atrim=duration={video_duration},volume={music_volume},afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start}:d=1[outa]'
            cmd.extend([
                '-filter_complex', filter_complex,
                '-map', '0:v',  # Video from clip
                '-map', '[outa]',  # Processed audio from music
                '-c:v', 'copy',
                '-c:a', 'aac'
                # Removed -shortest since we're explicitly controlling duration
            ])
        else:
            # Video-only clip, no audio needed
            cmd.extend([
                '-map', '0:v',
                '-c:v', 'copy',
                '-an'  # No audio
            ])
    else:
        # Multiple clips - add transitions
        filter_complex = build_transition_filter(
            num_clips=len(clip_files),
            transition_type=transition_type,
            transition_duration=transition_duration,
            has_music=has_music,
            music_volume=music_volume,
            fade_out_start=fade_out_start if has_music else 0,
            video_duration=video_duration if has_music else 0
        )
        
        cmd.extend(['-filter_complex', filter_complex])
        if has_music:
            cmd.extend(['-map', '[outv]', '-map', '[outa]'])
        else:
            cmd.extend(['-map', '[outv]', '-an'])  # No audio output
    
    # Output settings with error handling
    video_settings = [
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-movflags', '+faststart',
        '-avoid_negative_ts', 'make_zero',  # Handle timing issues
        '-fflags', '+genpts',  # Generate presentation timestamps
    ]
    
    # Add explicit duration control if we have music
    if has_music:
        video_settings.extend(['-t', str(video_duration)])  # Limit output duration
        video_settings.extend(['-c:a', 'aac', '-b:a', '128k'])
    
    cmd.extend(video_settings)
    cmd.append(output_file)
    
    return cmd


def build_transition_filter(num_clips: int, transition_type: str, transition_duration: float, 
                           has_music: bool, music_volume: float, fade_out_start: float = 10.0, video_duration: float = 0.0):
    """Build FFmpeg filter complex for video transitions"""
    
    if transition_type == 'fade':
        return build_fade_transition_filter(num_clips, transition_duration, has_music, music_volume, fade_out_start, video_duration)
    elif transition_type == 'crossfade':
        return build_crossfade_transition_filter(num_clips, transition_duration, has_music, music_volume, fade_out_start, video_duration)
    else:
        # Default to simple concatenation
        return build_concat_filter(num_clips, has_music, music_volume, fade_out_start, video_duration)


def build_fade_transition_filter(num_clips: int, transition_duration: float, has_music: bool, music_volume: float, fade_out_start: float, video_duration: float):
    """Build filter for fade transitions between clips - simplified approach"""
    
    # For fade transitions, we'll use a simpler approach without complex timing
    # Just concatenate clips and let FFmpeg handle the basic transitions
    return build_concat_filter(num_clips, has_music, music_volume, fade_out_start, video_duration)


def build_crossfade_transition_filter(num_clips: int, transition_duration: float, has_music: bool, music_volume: float, fade_out_start: float, video_duration: float):
    """Build filter for crossfade transitions between clips - simplified approach"""
    
    # Crossfade is complex to implement correctly with timing
    # For now, fall back to simple concatenation
    # TODO: Implement proper crossfade with duration calculations
    return build_concat_filter(num_clips, has_music, music_volume, fade_out_start, video_duration)


def build_concat_filter(num_clips: int, has_music: bool, music_volume: float, fade_out_start: float = 10.0, video_duration: float = 0.0):
    """Build simple concatenation filter for video-only clips"""
    
    # Since clips have no audio, only concatenate video streams
    video_inputs = ''.join([f'[{i}:v]' for i in range(num_clips)])
    
    # Video-only concatenation
    concat_filter = f'{video_inputs}concat=n={num_clips}:v=1:a=0[outv]'
    
    if has_music:
        # Add music as the audio track with volume control, duration trim, and fade in/out
        # Music is always the last input (after all video clips)
        # Trim to video duration, then apply volume and fades
        music_filter = f'[{num_clips}:a]atrim=duration={video_duration},volume={music_volume},afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start}:d=1[outa]'
        return f'{concat_filter};{music_filter}'
    else:
        # No audio output
        return concat_filter


def build_simple_fallback_command(clip_files: list, music_file: str, output_file: str, music_volume: float):
    """Build ultra-simple FFmpeg command as fallback"""
    
    cmd = ['./bin/ffmpeg', '-y']
    
    # Add all clip files
    for clip_file in clip_files:
        cmd.extend(['-i', clip_file])
    
    # Add music if provided
    if music_file and os.path.exists(music_file):
        cmd.extend(['-i', music_file])
        has_music = True
    else:
        has_music = False
    
    # Calculate fade out timing if we have music
    if has_music:
        if len(clip_files) == 1:
            video_duration = get_video_duration(clip_files[0])
        else:
            video_duration = sum(get_video_duration(clip) for clip in clip_files)
        fade_out_start = max(1.0, video_duration - 1.0)
    
    if len(clip_files) == 1:
        # Single clip - with audio processing for music
        if has_music:
            cmd.extend([
                '-filter_complex', f'[1:a]atrim=duration={video_duration},volume={music_volume},afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start}:d=1[outa]',
                '-map', '0:v',  # Video from clip
                '-map', '[outa]',  # Processed audio from music
                '-c:v', 'copy'
                # Removed -shortest since we're explicitly controlling duration
            ])
        else:
            cmd.extend([
                '-map', '0:v',
                '-c:v', 'copy',
                '-an'  # No audio
            ])
    else:
        # Multiple clips - video-only concatenation with music processing
        if has_music:
            # Create video inputs for concatenation
            video_inputs = ''.join([f'[{i}:v]' for i in range(len(clip_files))])
            cmd.extend([
                '-filter_complex', 
                f'{video_inputs}concat=n={len(clip_files)}:v=1:a=0[v];[{len(clip_files)}:a]atrim=duration={video_duration},volume={music_volume},afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start}:d=1[a]',
                '-map', '[v]', '-map', '[a]'
            ])
        else:
            # Create video inputs for concatenation
            video_inputs = ''.join([f'[{i}:v]' for i in range(len(clip_files))])
            cmd.extend([
                '-filter_complex', f'{video_inputs}concat=n={len(clip_files)}:v=1:a=0[v]',
                '-map', '[v]',
                '-an'  # No audio
            ])
    
    # Simple output settings
    output_settings = ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28']
    
    # Add duration control and audio codec if we have music
    if has_music:
        output_settings.extend(['-t', str(video_duration)])  # Limit output duration
        output_settings.extend(['-c:a', 'aac', '-b:a', '96k'])
    
    cmd.extend(output_settings)
    cmd.append(output_file)
    
    return cmd 