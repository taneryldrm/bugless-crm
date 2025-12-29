
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qulzeoytobflgktbtogg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bHplb3l0b2JmbGdrdGJ0b2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDMyMTEsImV4cCI6MjA4MDc3OTIxMX0.vn0s8NzjDSDHsy7ufOenkHluWw5Vlbn9gxzliJzCOrM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostic() {
  console.log('Testing connection to Supabase...');
  
  // Test profiles
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id, full_name, email, role');
  if (pError) {
    console.error('PROFILES Error:', pError.message, pError.code);
  } else {
    console.log('PROFILES found:', profiles.length);
    console.table(profiles);
  }

  // Test if we can see ANY metadata about the database
  const { data: version, error: vError } = await supabase.rpc('version');
  if (vError) {
    console.log('RPC version failed (expected for anon):', vError.message);
  } else {
    console.log('Postgres version:', version);
  }
}

diagnostic();
