
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qulzeoytobflgktbtogg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bHplb3l0b2JmbGdrdGJ0b2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDMyMTEsImV4cCI6MjA4MDc3OTIxMX0.vn0s8NzjDSDHsy7ufOenkHluWw5Vlbn9gxzliJzCOrM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSessions() {
    console.log("Checking Work Sessions and Profiles...");

    const { data: profiles, error: pError } = await supabase.from('profiles').select('id, full_name, email');
    if (pError) { console.error("Profiles error:", pError); return; }

    const { data: sessions, error: sError } = await supabase.from('work_sessions').select('id, user_id, duration, start_time');
    if (sError) { console.error("Sessions error:", sError); return; }

    console.log(`Found ${profiles.length} profiles and ${sessions.length} sessions.`);

    const profileMap = {};
    profiles.forEach(p => profileMap[p.id] = p.full_name);

    let orphans = 0;
    sessions.forEach(s => {
        const name = profileMap[s.user_id];
        if (!name) {
            console.log(`Orphan Session ID: ${s.id}, User ID: ${s.user_id} (No Profile Found)`);
            orphans++;
        }
    });

    console.log(`Total Orphan Sessions: ${orphans}`);
}

checkSessions();
