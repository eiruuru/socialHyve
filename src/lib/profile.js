import { supabase } from './supabase';

export async function getProfile() {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile({ fullName }) {
  const trimmed = fullName.trim();
  if (!trimmed) throw new Error('Name is required');

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();
  if (error) throw error;

  const { error: metaErr } = await supabase.auth.updateUser({
    data: { full_name: trimmed },
  });
  if (metaErr) throw metaErr;

  return data;
}

export async function updateEmail(newEmail) {
  const trimmed = newEmail.trim();
  if (!trimmed) throw new Error('Email is required');

  const { data, error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) throw error;
  return data;
}

export async function updatePassword({ currentPassword, newPassword }) {
  if (!currentPassword) throw new Error('Current password is required');
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user?.email) throw new Error('Not signed in');

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInErr) throw new Error('Current password is incorrect');

  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}
