import { supabase } from './supabaseClient';

export type ActionType = 'login' | 'upload_image' | 'analysis_complete' | 'save_project' | 'chat_message' | 'translate_report' | 'add_additional_photo';

export const logUserAction = async (actionType: ActionType, details?: any) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase.from('user_actions').insert({
      user_id: session.user.id,
      action_type: actionType,
      details: details || {}
    });

    if (error) {
      console.error('Failed to log action:', error);
    }
  } catch (err) {
    console.error('Analytics error:', err);
  }
};
