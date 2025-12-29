
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log("Checking RLS status for all tables...");
    
    // We can't directly check pg_class via anon key usually.
    // But we can try to insert and catch the error.
    
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(1);
    console.log("Profiles access:", pError ? pError.message : "Success (" + profiles.length + " rows)");

    const { data: extTasks, error: eError } = await supabase.from('external_tasks').select('*').limit(1);
    console.log("External Tasks access:", eError ? eError.message : "Success (" + extTasks.length + " rows)");

    const { data: workOrders, error: wError } = await supabase.from('work_orders').select('*').limit(1);
    console.log("Work Orders access:", wError ? wError.message : "Success (" + workOrders.length + " rows)");

    // Try a test RPC
    const { data: dashTasks, error: dError } = await supabase.rpc('get_my_dashboard_tasks');
    console.log("RPC get_my_dashboard_tasks:", dError ? dError.message : "Success (" + (dashTasks ? dashTasks.length : 0) + " rows)");
}

checkRLS();
