
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qulzeoytobflgktbtogg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bHplb3l0b2JmbGdrdGJ0b2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDMyMTEsImV4cCI6MjA4MDc3OTIxMX0.vn0s8NzjDSDHsy7ufOenkHluWw5Vlbn9gxzliJzCOrM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteToAdmin() {
  console.log('Logging in as sumeyye@bugless.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'sumeyye@bugless.com',
    password: 'Sumeyye123'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log('Login successful! User ID:', userId);

  console.log('Updating role to Yönetici...');
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'Yönetici' })
    .eq('id', userId);

  if (updateError) {
    console.error('Update failed:', updateError.message);
    console.log('Attempting to see if profile exists...');
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile) {
      console.log('Profile not found. Creating profile...');
      const { error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: 'Sümeyye Şencan',
        email: 'sumeyye@bugless.com',
        role: 'Yönetici'
      });
      if (insertError) console.error('Insert failed:', insertError.message);
      else console.log('Profile created as Yönetici!');
    }
  } else {
    console.log('Role successfully updated to Yönetici!');
  }
}

promoteToAdmin();
