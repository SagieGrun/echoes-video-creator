import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('Storage initialization:', { 
  hasUrl: !!supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl?.length,
  keyLength: supabaseAnonKey?.length
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test Supabase connection
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth state:', event, session?.user?.id || 'no user')
})

export async function uploadPhoto(file: File, userId: string, projectId: string) {
  try {
    console.log('Upload started:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${projectId}/${Date.now()}.${fileExt}`
    
    console.log('Generated filename:', fileName)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('private-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error details:', {
        message: uploadError.message,
        name: uploadError.name
      })
      throw uploadError
    }

    console.log('Upload successful:', uploadData)

    // Get signed URL for temporary access
    const { data, error } = await supabase.storage
      .from('private-photos')
      .createSignedUrl(fileName, 3600) // 1 hour expiry

    if (error || !data?.signedUrl) {
      throw error || new Error('Failed to get signed URL')
    }

    return {
      path: fileName,
      url: data.signedUrl
    }
  } catch (error) {
    console.error('Upload process error:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    throw error
  }
}

export async function deletePhoto(path: string) {
  try {
    const { error } = await supabase.storage
      .from('private-photos')
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      throw error
    }
  } catch (error) {
    console.error('Error deleting photo:', error)
    throw error
  }
}

export async function getSignedUrl(path: string, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from('private-photos')
      .createSignedUrl(path, expiresIn)

    if (error || !data?.signedUrl) {
      throw error || new Error('Failed to get signed URL')
    }

    return data.signedUrl
  } catch (error) {
    console.error('Error getting signed URL:', error)
    throw error
  }
} 