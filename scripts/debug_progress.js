
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

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
                    console.log(`    - Task '${t.title}' status is '${t.status}' (Length: ${t.status.length})`);
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
}

checkLogic();
