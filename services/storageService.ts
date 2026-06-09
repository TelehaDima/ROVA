import { RestorationReport } from '../types';
import { supabase } from './supabaseClient';
import { logUserAction } from './analyticsService';

export const saveProject = async (project: RestorationReport): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const { error } = await supabase.from('projects').upsert({
      id: project.id,
      user_id: session.user.id,
      data: project,
      updated_at: new Date().toISOString()
    });

    if (error) throw error;
    
    await logUserAction('save_project', { project_id: project.id });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getProjects = async (): Promise<RestorationReport[]> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    const { data, error } = await supabase
      .from('projects')
      .select('data')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    
    return data.map((row: any) => row.data as RestorationReport);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);
  } catch (error) {
    console.error('Error deleting project:', error);
  }
};
