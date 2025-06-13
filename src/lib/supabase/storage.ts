import { createSupabaseBrowserClient } from '@/lib/supabase'

console.log('Storage initialization:', { 
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL, 
  hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length,
  keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length
})

// Create or get a default project for the user
async function getOrCreateDefaultProject(userId: string) {
  const supabase = createSupabaseBrowserClient()
  
  // First, try to get an existing project
  const { data: existingProject, error: fetchError } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .limit(1)
    .single()

  if (existingProject && !fetchError) {
    return existingProject.id
  }

  // If no project exists, create a new one
  const { data: newProject, error: createError } = await supabase
    .from('projects')
    .insert({
      user_id: userId
    })
    .select('id')
    .single()

  if (createError) {
    console.error('Error creating project:', createError)
    throw new Error('Failed to create project')
  }

  return newProject.id
}

export async function uploadPhoto(file: File) {
  const supabase = createSupabaseBrowserClient()
  
  try {
    console.log('Upload started:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      console.error('Authentication error:', authError)
      throw new Error('You must be logged in to upload photos')
    }

    const userId = session.user.id
    console.log('Authenticated user:', userId)

    // Get or create a project for this user
    const projectId = await getOrCreateDefaultProject(userId)
    console.log('Using project:', projectId)

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
      url: data.signedUrl,
      projectId: projectId
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
  const supabase = createSupabaseBrowserClient()
  
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
  const supabase = createSupabaseBrowserClient()
  
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