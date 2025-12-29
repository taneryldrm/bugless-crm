
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qulzeoytobflgktbtogg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bHplb3l0b2JmbGdrdGJ0b2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDMyMTEsImV4cCI6MjA4MDc3OTIxMX0.vn0s8NzjDSDHsy7ufOenkHluWw5Vlbn9gxzliJzCOrM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  console.log('--- Database Diagnostic ---');
  console.log('Current Time:', new Date().toLocaleString());
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at');

  if (error) {
    console.error('ERROR DETECTED:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Hint:', error.hint);
    console.error('Details:', error.details);
    
    if (error.code === '42501') {
      console.log('\nSUGGESTION: This is a "Permission Denied" error. Please run MASTER_REPAIR.sql in Supabase SQL Editor.');
    } else if (error.message.includes('recursion')) {
      console.log('\nSUGGESTION: This is an "Infinite Recursion" error. Please run MASTER_REPAIR.sql in Supabase SQL Editor.');
    }
  } else {
    console.log('SUCCESS: Profiles fetched correctly.');
    console.log('Count:', data?.length || 0);
    if (data && data.length > 0) {
      console.table(data);
    } else {
      console.log('Note: Data is empty. This might be due to RLS filter if you are using an anon key or no users exist.');
    }
  }
}

listUsers();
