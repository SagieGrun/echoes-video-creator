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
        "video_id": "existing_video_id", // ID of the processing record to update
        "clips": [
            {
                "id": "clip_id",
                "video_file_path": "path/to/video.mp4",
                "order": 1
            }
        ],
        "music": {
            "id": "music_id",
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
        video_id = body.get('video_id')  # ID of existing processing record
        clips = body.get('clips', [])
        music = body.get('music', {})
        settings = body.get('settings', {})
        
        logger.info(f"Request parameters: user_id={user_id}, video_id={video_id}, clips_count={len(clips)}, music={music}, settings={settings}")
        
        if not user_id or not clips:
            # Update status to failed if we have video_id
            if video_id:
                try:
                    supabase.from_('final_videos').update({
                        'status': 'failed',
                        'error_message': 'Missing required parameters: user_id and clips'
                    }).eq('id', video_id).execute()
                except Exception as update_error:
                    logger.error(f"Failed to update status to failed: {update_error}")
            
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
            # Update status to failed if we have video_id
            if video_id:
                try:
                    supabase.from_('final_videos').update({
                        'status': 'failed',
                        'error_message': 'No clips with valid video_file_path found'
                    }).eq('id', video_id).execute()
                except Exception as update_error:
                    logger.error(f"Failed to update status to failed: {update_error}")
            
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
            
            # Generate public URL for the video
            public_url = generate_public_url(final_video_path)
            
            # Update existing record in database
            if video_id:
                # Update the existing processing record
                update_data = {
                    'file_path': final_video_path,
                    'public_url': public_url,
                    'status': 'completed',
                    'completed_at': 'now()'
                }
                
                result = supabase.from_('final_videos').update(update_data).eq('id', video_id).execute()
                
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'message': 'Video compilation completed successfully',
                        'video_id': video_id,
                        'video_file_path': final_video_path
                    })
                }
            else:
                # Fallback: create new record (for backward compatibility)
                final_video_record = {
                    'user_id': user_id,
                    'file_path': final_video_path,
                    'public_url': public_url,
                    'selected_clips': [clip['id'] for clip in valid_clips],
                    'music_track_id': music.get('id') if music and music.get('id') else None,
                    'transition_type': settings.get('transition_type', 'fade'),
                    'music_volume': music.get('volume', 0.3) if music else None,
                    'status': 'completed'
                }
                
                result = supabase.from_('final_videos').insert(final_video_record).execute()
                
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'message': 'Video compilation completed successfully',
                        'video_id': 'new_record',  # Since we can't get ID without select
                        'video_file_path': final_video_path
                    })
                }
            
    except Exception as e:
        logger.error(f"Error in video compilation: {str(e)}")
        
        # Update status to failed if we have video_id
        if 'video_id' in locals() and video_id:
            try:
                supabase.from_('final_videos').update({
                    'status': 'failed',
                    'error_message': str(e)
                }).eq('id', video_id).execute()
            except Exception as update_error:
                logger.error(f"Failed to update status to failed: {update_error}")
        
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

def generate_public_url(file_path: str) -> str:
    """Generate public URL for a file in the final-videos bucket"""
    try:
        # Get the Supabase project URL from environment
        supabase_url = get_parameter('SUPABASE_URL')
        
        # Format: https://[project-id].supabase.co/storage/v1/object/public/final-videos/[file-path]
        public_url = f"{supabase_url}/storage/v1/object/public/final-videos/{file_path}"
        
        logger.info(f"Generated public URL: {public_url}")
        return public_url
        
    except Exception as e:
        logger.error(f"Failed to generate public URL for {file_path}: {str(e)}")
        # Return a fallback URL structure
        return f"https://project.supabase.co/storage/v1/object/public/final-videos/{file_path}"

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
    
    # Add music file if provided and volume > 0
    if music_file and os.path.exists(music_file) and music_volume > 0:
        cmd.extend(['-i', music_file])
        has_music = True
    else:
        has_music = False
    
    # Always calculate total video duration for proper fade timing
    if len(clip_files) == 1:
        # Single clip duration
        video_duration = get_video_duration(clip_files[0])
    else:
        # Multiple clips - sum their durations (approximation)
        video_duration = sum(get_video_duration(clip) for clip in clip_files)
        
    # Calculate fade out start time (1 second before end, minimum at 1 second)
    if has_music:
        fade_out_start = max(1.0, video_duration - 1.0)
    else:
        fade_out_start = 0
    
    # Build filter complex for transitions
    if len(clip_files) == 1:
        # Single clip - need to process music with volume, fade, and duration
        if has_music:
            # Apply video fade in/out (0.5s each) and music processing
            video_fade_out_start = max(0.5, video_duration - 0.5)
            filter_complex = f'[0:v]fade=t=in:st=0:d=0.5,fade=t=out:st={video_fade_out_start}:d=0.5[outv];[1:a]atrim=duration={video_duration},volume={music_volume},afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start}:d=1[outa]'
            cmd.extend([
                '-filter_complex', filter_complex,
                '-map', '[outv]',  # Processed video with fades
                '-map', '[outa]',  # Processed audio from music
                '-c:a', 'aac'
                # Removed -shortest since we're explicitly controlling duration
                # Note: video codec settings will be added later in video_settings
            ])
        else:
            # Video-only clip with fade in/out
            video_fade_out_start = max(0.5, video_duration - 0.5)
            filter_complex = f'[0:v]fade=t=in:st=0:d=0.5,fade=t=out:st={video_fade_out_start}:d=0.5[outv]'
            cmd.extend([
                '-filter_complex', filter_complex,
                '-map', '[outv]',  # Processed video with fades
                '-an'  # No audio
                # Note: video codec settings will be added later in video_settings
            ])
    else:
        # Multiple clips - add transitions
        # Get individual clip durations for proper transition timing
        clip_durations = [get_video_duration(clip) for clip in clip_files]
        
        filter_complex = build_transition_filter(
            num_clips=len(clip_files),
            transition_type=transition_type,
            transition_duration=transition_duration,
            has_music=has_music,
            music_volume=music_volume,
            fade_out_start=fade_out_start if has_music else 0,
            video_duration=video_duration,  # Always pass video_duration for fade calculations
            clip_durations=clip_durations
        )
        
        cmd.extend(['-filter_complex', filter_complex])
        if has_music:
            cmd.extend(['-map', '[outv]', '-map', '[outa]'])
        else:
            cmd.extend(['-map', '[outv]', '-an'])  # No audio output
    
    # Output settings with high quality maintained and web compatibility
    video_settings = [
        '-c:v', 'libx264',
        '-profile:v', 'baseline',  # Baseline profile for maximum compatibility
        '-level:v', '3.0',         # Level 3.0 for web compatibility
        '-pix_fmt', 'yuv420p',     # Pixel format required for web playback
        '-preset', 'fast',         # Good balance of speed and quality
        '-crf', '23',              # High quality
        '-movflags', '+faststart', # Enable progressive download
        '-avoid_negative_ts', 'make_zero',  # Handle timing issues
        '-fflags', '+genpts',      # Generate presentation timestamps
        '-max_muxing_queue_size', '1024',  # Handle complex filter chains
    ]
    
    # Add explicit duration control to prevent freezing
    video_settings.extend(['-t', str(video_duration)])  # Always limit output duration
    
    # Add audio settings if we have music
    if has_music:
        video_settings.extend(['-c:a', 'aac', '-b:a', '128k'])
    
    cmd.extend(video_settings)
    cmd.append(output_file)
    
    return cmd


def build_transition_filter(num_clips: int, transition_type: str, transition_duration: float, 
                           has_music: bool, music_volume: float, fade_out_start: float = 10.0, 
                           video_duration: float = 0.0, clip_durations: list = None):
    """Build FFmpeg filter complex for video transitions"""
    
    if clip_durations is None:
        clip_durations = [5.0] * num_clips  # Default to 5 seconds per clip
    
    if transition_type == 'fade':
        return build_fade_transition_filter(num_clips, transition_duration, has_music, music_volume, fade_out_start, video_duration, clip_durations)
    elif transition_type == 'dissolve' or transition_type == 'crossfade':
        return build_crossfade_transition_filter(num_clips, transition_duration, has_music, music_volume, fade_out_start, video_duration, clip_durations)
    elif transition_type == 'slide':
        return build_slide_transition_filter(num_clips, transition_duration, has_music, music_volume, fade_out_start, video_duration, clip_durations)
    else:
        # Default to simple cut (no transition)
        return build_concat_filter(num_clips, has_music, music_volume, fade_out_start, video_duration)


def build_fade_transition_filter(num_clips: int, transition_duration: float, has_music: bool, music_volume: float, fade_out_start: float, video_duration: float, clip_durations: list):
    """Build filter for fade-to-black transitions between clips"""
    
    if num_clips < 2:
        return build_concat_filter(num_clips, has_music, music_volume, fade_out_start, video_duration)
    
    # Build fade-to-black transitions between clips
    # Each clip fades out to black, then next clip fades in from black (for transitions only)
    filter_parts = []
    
    # Process each clip with fade out (except last) and fade in (except first) for transitions
    for i in range(num_clips):
        clip_filter = f'[{i}:v]'
        clip_duration = clip_durations[i]
        fade_out_time = max(0, clip_duration - transition_duration)
        
        if i == 0:
            # First clip: only fade out at the end for transition
            clip_filter += f'fade=t=out:st={fade_out_time}:d={transition_duration}'
        elif i == num_clips - 1:
            # Last clip: only fade in at the start for transition
            clip_filter += f'fade=t=in:st=0:d={transition_duration}'
        else:
            # Middle clips: fade in at start, fade out at end for transitions
            clip_filter += f'fade=t=in:st=0:d={transition_duration},fade=t=out:st={fade_out_time}:d={transition_duration}'
        
        clip_filter += f'[v{i}]'
        filter_parts.append(clip_filter)
    
    # Concatenate the processed clips
    video_inputs = ''.join([f'[v{i}]' for i in range(num_clips)])
    concat_filter = f'{video_inputs}concat=n={num_clips}:v=1:a=0[concat_v]'
    filter_parts.append(concat_filter)
    
    # Add final video fade in/out (0.5s each) to the ENTIRE final video
    final_fade_out_start = max(0.5, video_duration - 0.5) if video_duration > 0 else max(0.5, sum(clip_durations) - 0.5)
    final_fade_filter = f'[concat_v]fade=t=in:st=0:d=0.5,fade=t=out:st={final_fade_out_start}:d=0.5[outv]'
    filter_parts.append(final_fade_filter)
    
    if has_music:
        # Add music processing
        music_filter = f'[{num_clips}:a]atrim=duration={video_duration},volume={music_volume},afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start}:d=1[outa]'
        filter_parts.append(music_filter)
    
    return ';'.join(filter_parts)


def build_crossfade_transition_filter(num_clips: int, transition_duration: float, has_music: bool, music_volume: float, fade_out_start: float, video_duration: float, clip_durations: list):
    """Build filter for crossfade (dissolve) transitions between clips"""
    
    if num_clips < 2:
        return build_concat_filter(num_clips, has_music, music_volume, fade_out_start, video_duration)
    
    # For crossfade, we need to overlap clips and blend them
    # This is more complex but creates smooth dissolve transitions
    filter_parts = []
    
    # First clip (no modification needed)
    current_stream = '[0:v]'
    
    # Calculate cumulative offset for each transition
    cumulative_offset = 0
    
    # Apply crossfade between each pair of clips
    for i in range(1, num_clips):
        # Calculate offset based on previous clip duration minus transition overlap
        prev_clip_duration = clip_durations[i-1]
        offset = cumulative_offset + prev_clip_duration - transition_duration
        
        # Create crossfade between current stream and next clip
        crossfade_filter = f'{current_stream}[{i}:v]xfade=transition=fade:duration={transition_duration}:offset={offset}[v{i}]'
        filter_parts.append(crossfade_filter)
        current_stream = f'[v{i}]'
        
        # Update cumulative offset for next iteration
        cumulative_offset = offset
    
    # The final stream is our output video - add fade in/out to the final result
    final_fade_out_start = max(0.5, video_duration - 0.5) if video_duration > 0 else max(0.5, sum(clip_durations) - 0.5)
    
    final_stream = current_stream.replace('[', '').replace(']', '')
    if final_stream != f'v{num_clips-1}':
        # If we only have 2 clips, add fade effects
        filter_parts.append(f'{current_stream}fade=t=in:st=0:d=0.5,fade=t=out:st={final_fade_out_start}:d=0.5[outv]')
    else:
        # For multiple clips, add fade effects to the last xfade output
        filter_parts[-1] = filter_parts[-1].replace(f'[v{num_clips-1}]', '[xfade_v]')
        filter_parts.append(f'[xfade_v]fade=t=in:st=0:d=0.5,fade=t=out:st={final_fade_out_start}:d=0.5[outv]')
    
    if has_music:
        # Add music processing
        music_filter = f'[{num_clips}:a]atrim=duration={video_duration},volume={music_volume},afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start}:d=1[outa]'
        filter_parts.append(music_filter)
    
    return ';'.join(filter_parts)


def build_slide_transition_filter(num_clips: int, transition_duration: float, has_music: bool, music_volume: float, fade_out_start: float, video_duration: float, clip_durations: list):
    """Build filter for slide transitions between clips"""
    
    if num_clips < 2:
        return build_concat_filter(num_clips, has_music, music_volume, fade_out_start, video_duration)
    
    # For slide transitions, we use xfade with slide effects
    filter_parts = []
    
    # First clip (no modification needed)
    current_stream = '[0:v]'
    
    # Apply slide transition between each pair of clips
    # Alternate between different slide directions for variety
    slide_directions = ['slideleft', 'slideright', 'slideup', 'slidedown']
    
    # Calculate cumulative offset for each transition
    cumulative_offset = 0
    
    for i in range(1, num_clips):
        # Choose slide direction (cycle through options)
        direction = slide_directions[(i-1) % len(slide_directions)]
        
        # Calculate offset based on previous clip duration minus transition overlap
        prev_clip_duration = clip_durations[i-1]
        offset = cumulative_offset + prev_clip_duration - transition_duration
        
        # Create slide transition between current stream and next clip
        slide_filter = f'{current_stream}[{i}:v]xfade=transition={direction}:duration={transition_duration}:offset={offset}[v{i}]'
        filter_parts.append(slide_filter)
        current_stream = f'[v{i}]'
        
        # Update cumulative offset for next iteration
        cumulative_offset = offset
    
    # The final stream is our output video - add fade in/out to the final result
    final_fade_out_start = max(0.5, video_duration - 0.5) if video_duration > 0 else max(0.5, sum(clip_durations) - 0.5)
    
    final_stream = current_stream.replace('[', '').replace(']', '')
    if final_stream != f'v{num_clips-1}':
        # If we only have 2 clips, add fade effects
        filter_parts.append(f'{current_stream}fade=t=in:st=0:d=0.5,fade=t=out:st={final_fade_out_start}:d=0.5[outv]')
    else:
        # For multiple clips, add fade effects to the last xfade output
        filter_parts[-1] = filter_parts[-1].replace(f'[v{num_clips-1}]', '[xfade_v]')
        filter_parts.append(f'[xfade_v]fade=t=in:st=0:d=0.5,fade=t=out:st={final_fade_out_start}:d=0.5[outv]')
    
    if has_music:
        # Add music processing
        music_filter = f'[{num_clips}:a]atrim=duration={video_duration},volume={music_volume},afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start}:d=1[outa]'
        filter_parts.append(music_filter)
    
    return ';'.join(filter_parts)


def build_concat_filter(num_clips: int, has_music: bool, music_volume: float, fade_out_start: float = 10.0, video_duration: float = 0.0):
    """Build simple concatenation filter for video-only clips"""
    
    # Since clips have no audio, only concatenate video streams
    video_inputs = ''.join([f'[{i}:v]' for i in range(num_clips)])
    
    if num_clips == 1:
        # Single clip - add fade in/out directly
        final_fade_out_start = max(0.5, video_duration - 0.5) if video_duration > 0 else 4.5  # Default 5s clip - 0.5s
        concat_filter = f'[0:v]fade=t=in:st=0:d=0.5,fade=t=out:st={final_fade_out_start}:d=0.5[outv]'
    else:
        # Multiple clips - concatenate then add fade in/out
        final_fade_out_start = max(0.5, video_duration - 0.5) if video_duration > 0 else max(0.5, (num_clips * 5.0) - 0.5)  # Estimate total duration
        concat_filter = f'{video_inputs}concat=n={num_clips}:v=1:a=0[concat_v];[concat_v]fade=t=in:st=0:d=0.5,fade=t=out:st={final_fade_out_start}:d=0.5[outv]'
    
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
    
    # Add music if provided and volume > 0
    if music_file and os.path.exists(music_file) and music_volume > 0:
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
        # Single clip - with video fade and audio processing for music
        video_fade_out_start = max(0.5, video_duration - 0.5)
        if has_music:
            cmd.extend([
                '-filter_complex', f'[0:v]fade=t=in:st=0:d=0.5,fade=t=out:st={video_fade_out_start}:d=0.5[outv];[1:a]atrim=duration={video_duration},volume={music_volume},afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start}:d=1[outa]',
                '-map', '[outv]',  # Processed video with fades
                '-map', '[outa]',  # Processed audio from music
                # Removed -shortest since we're explicitly controlling duration
                # Note: video codec settings will be added later in output_settings
            ])
        else:
            cmd.extend([
                '-filter_complex', f'[0:v]fade=t=in:st=0:d=0.5,fade=t=out:st={video_fade_out_start}:d=0.5[outv]',
                '-map', '[outv]',  # Processed video with fades
                '-an'  # No audio
                # Note: video codec settings will be added later in output_settings
            ])
    else:
        # Multiple clips - video concatenation with fade effects and music processing
        video_fade_out_start = max(0.5, video_duration - 0.5)
        if has_music:
            # Create video inputs for concatenation with fade effects
            video_inputs = ''.join([f'[{i}:v]' for i in range(len(clip_files))])
            cmd.extend([
                '-filter_complex', 
                f'{video_inputs}concat=n={len(clip_files)}:v=1:a=0[concat_v];[concat_v]fade=t=in:st=0:d=0.5,fade=t=out:st={video_fade_out_start}:d=0.5[v];[{len(clip_files)}:a]atrim=duration={video_duration},volume={music_volume},afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start}:d=1[a]',
                '-map', '[v]', '-map', '[a]'
            ])
        else:
            # Create video inputs for concatenation with fade effects
            video_inputs = ''.join([f'[{i}:v]' for i in range(len(clip_files))])
            cmd.extend([
                '-filter_complex', f'{video_inputs}concat=n={len(clip_files)}:v=1:a=0[concat_v];[concat_v]fade=t=in:st=0:d=0.5,fade=t=out:st={video_fade_out_start}:d=0.5[v]',
                '-map', '[v]',
                '-an'  # No audio
            ])
    
    # Simple output settings with quality maintained and web compatibility
    output_settings = [
        '-c:v', 'libx264',
        '-profile:v', 'baseline',  # Baseline profile for maximum compatibility
        '-level:v', '3.0',         # Level 3.0 for web compatibility
        '-pix_fmt', 'yuv420p',     # Pixel format required for web playback
        '-preset', 'fast',         # Good balance of speed and quality
        '-crf', '23',              # High quality
        '-movflags', '+faststart', # Enable progressive download
        '-max_muxing_queue_size', '1024'  # Handle complex filter chains
    ]
    
    # Always add duration control to prevent video freezing
    if len(clip_files) == 1:
        video_duration = get_video_duration(clip_files[0])
    else:
        video_duration = sum(get_video_duration(clip) for clip in clip_files)
    
    output_settings.extend(['-t', str(video_duration)])  # Always limit output duration
    
    # Add audio codec if we have music
    if has_music:
        output_settings.extend(['-c:a', 'aac', '-b:a', '96k'])
    
    cmd.extend(output_settings)
    cmd.append(output_file)
    
    return cmd 