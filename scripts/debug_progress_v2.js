
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qulzeoytobflgktbtogg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bHplb3l0b2JmbGdrdGJ0b2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDMyMTEsImV4cCI6MjA4MDc3OTIxMX0.vn0s8NzjDSDHsy7ufOenkHluWw5Vlbn9gxzliJzCOrM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkLogic() {
    console.log("Checking Project <-> Work Order relationship...");

    const { data: projects, error: pError } = await supabase.from('projects').select('id, name, status');
    if (pError) { console.error("Project error:", pError); return; }

    const { data: workOrders, error: wError } = await supabase.from('work_orders').select('id, project_id, status, title');
    if (wError) { console.error("Work Order error:", wError); return; }

    console.log(`Found ${projects.length} projects and ${workOrders.length} work orders.`);

    projects.forEach(p => {
        const tasks = workOrders.filter(w => w.project_id === p.id);
        if (tasks.length > 0) {
            console.log(`\nProject: ${p.name} (Status: ${p.status})`);
            console.log(`  - Total Tasks: ${tasks.length}`);
            
            const completed = tasks.filter(w => w.status === 'Tamamlandı').length;
            console.log(`  - Completed Tasks: ${completed}`);
            
            // Check for exact string matches on status if count is 0 but looks like it should be more
            tasks.forEach(t => {
                if (t.status !== 'Tamamlandı') {
                    console.log(`    - Task '${t.title}' status is '${t.status}'`);
                } else {
                     console.log(`    - Task '${t.title}' is COUNTED as completed.`);
                }
            });

            const calculated = Math.round((completed / tasks.length) * 100);
            console.log(`  - Calculated Progress: ${calculated}%`);
        } else {
             // console.log(`Project: ${p.name} has no tasks.`);
        }
    });

    if (projects.length === 0) console.log("No projects found.");
}

checkLogic();
