import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('music_tracks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ tracks: data })
  } catch (error) {
    console.error('Error fetching music tracks:', error)
    return NextResponse.json({ error: 'Failed to fetch music tracks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const fileBuffer = await file.arrayBuffer();
    const filePath = `music/${Date.now()}_${file.name}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('music-tracks')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('music-tracks')
      .getPublicUrl(filePath)

    // Insert into database
    const { data: dbData, error: dbError } = await supabase
      .from('music_tracks')
      .insert({
        name: file.name,
        file_url: urlData.publicUrl,
        file_path: filePath,
        is_active: true,
        file_size: file.size,
      })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json({ success: true, track: dbData })
  } catch (error) {
    console.error('Error uploading music track:', error)
    return NextResponse.json({ error: 'Failed to upload music track' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
    const { id, file_path } = await request.json()
  
    if (!id || !file_path) {
      return NextResponse.json({ error: 'Track ID and file path are required' }, { status: 400 })
    }
  
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('music-tracks')
        .remove([file_path])
      
      if (storageError) {
        console.error('Error deleting from storage:', storageError)
      }
  
      // Delete from database
      const { error: dbError } = await supabase
        .from('music_tracks')
        .delete()
        .eq('id', id)
  
      if (dbError) throw dbError
  
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting music track:', error)
      return NextResponse.json({ error: 'Failed to delete music track' }, { status: 500 })
    }
  } 