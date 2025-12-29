
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qulzeoytobflgktbtogg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bHplb3l0b2JmbGdrdGJ0b2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDMyMTEsImV4cCI6MjA4MDc3OTIxMX0.vn0s8NzjDSDHsy7ufOenkHluWw5Vlbn9gxzliJzCOrM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  const email = 'admin@bugless.com';
  const password = 'admin123';
  const fullName = 'Sistem Yöneticisi';

  console.log(`Creating user ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  });

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('User created successfully!');
    console.log('User ID:', data.user.id);
    console.log('IMPORTANT: If email confirmation is enabled, you must verify the email before logging in.');
    console.log('IMPORTANT: You must manually send to Supabase Dashboard -> Table Editor -> profiles and change the role of this user from "Mühendis" to "Yönetici".');
  }
}

createAdmin();
