import { supabase } from './supabase'

/**
 * Get the system prompt from admin configuration
 */
export async function getSystemPrompt(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'system_prompt')
      .single()

    if (error) {
      console.error('Error fetching system prompt:', error)
      // Return default prompt if configuration not found
      return 'Create a beautiful, cinematic animated clip from this photo. Add subtle movement and depth while maintaining the original character and mood of the image.'
    }

    return data.value?.prompt || 'Create a beautiful, cinematic animated clip from this photo. Add subtle movement and depth while maintaining the original character and mood of the image.'
  } catch (error) {
    console.error('Error in getSystemPrompt:', error)
    // Return default prompt on any error
    return 'Create a beautiful, cinematic animated clip from this photo. Add subtle movement and depth while maintaining the original character and mood of the image.'
  }
}

/**
 * Get credit pack configuration
 */
export async function getCreditPacks() {
  try {
    const { data, error } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'credit_packs')
      .single()

    if (error) {
      console.error('Error fetching credit packs:', error)
      return []
    }

    return data.value?.packs || []
  } catch (error) {
    console.error('Error in getCreditPacks:', error)
    return []
  }
} 