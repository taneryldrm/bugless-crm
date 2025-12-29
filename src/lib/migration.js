import { supabase } from './supabase';

export const migrateData = async () => {
  const results = {
    clients: { success: 0, fail: 0 },
    projects: { success: 0, fail: 0 },
    tasks: { success: 0, fail: 0 },
    transactions: { success: 0, fail: 0 },
    errors: []
  };

  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Authentication required for migration.");

    // 1. MIGRATE CLIENTS
    const localCustomers = JSON.parse(localStorage.getItem('clients_data') || '[]');
    const clientMap = {}; // Map old ID to new UUID
    const clientNameMap = {}; // Map Name to new UUID (for project linking)

    for (const c of localCustomers) {
      try {
        const { data, error } = await supabase.from('clients').insert({
          name: c.name,
          phone: c.phone || '',
          type: c.type === 'Sıkıntılı' ? 'Sıkıntılı' : (c.label === 'Kurumsal' ? 'Kurumsal' : 'Normal'),
          status: c.type === 'Pasif' ? 'Pasif' : 'Aktif',
          email: '', // Mock data didn't have email
          address: c.address || '', 
          notes: ''
        }).select().single();

        if (error) throw error;
        clientMap[c.id] = data.id;
        clientNameMap[c.name] = data.id; // Map name for lookup
        results.clients.success++;

      } catch (e) {
        console.error("Client migrate error", e);
        results.clients.fail++;
        results.errors.push(`Client ${c.name}: ${e.message}`);
      }
    }

    // 2. MIGRATE PROJECTS
    const localProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    const projectNameMap = {}; // Map Name to UUID

    for (const p of localProjects) {
        try {
            // Find client ID by name
            let clientId = null;
            if (p.customer) {
                clientId = clientNameMap[p.customer];
            }

            const { data, error } = await supabase.from('projects').insert({
                name: p.name,
                client_id: clientId, // Can be null
                status: p.status === 'Tamamlandı' ? 'Tamamlandı' : 'Devam Ediyor',
                price: parseFloat(p.price?.toString().replace('₺','').replace('.','').replace(',','.') || 0),
                start_date: p.dates ? new Date().toISOString() : null, // Dates string parsing is complex
                description: p.description,
                manager_id: user.id // Assign to current admin for now
            }).select().single();

            if (error) throw error;
            projectNameMap[p.name] = data.id;
            results.projects.success++;
        } catch (e) {
             console.error("Project migrate error", e);
             results.projects.fail++;
        }
    }

    // 3. MIGRATE WORK ORDERS (TASKS)
    const localOrders = JSON.parse(localStorage.getItem('workOrders') || '[]');
    for (const task of localOrders) {
        try {
             // Find Project ID
             let projectId = null;
             if (task.project) {
                 projectId = projectNameMap[task.project];
             }

             // Date Parsing (DD.MM.YYYY)
             let dueDate = null;
             if (task.date) {
                 const parts = task.date.split('.');
                 if(parts.length === 3) {
                     // Note: Strings like '31.12.2025'
                     dueDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD for date type
                 }
             }

             // Append Legacy Assignees to Description
             let desc = task.description || '';
             if (task.assignedTo && task.assignedTo.length > 0) {
                 desc += `\n\n[Legacy Assigned: ${task.assignedTo.join(', ')}]`;
             }

             const { error } = await supabase.from('work_orders').insert({
                 title: task.title,
                 description: desc,
                 status: task.status === 'Tamamlandı' ? 'Tamamlandı' : 'Bekliyor',
                 priority: task.priority || 'Normal',
                 due_date: dueDate,
                 project_id: projectId,
                 assigned_to: null // Cannot map names to UUIDs reliably yet
             });

             if (error) throw error;
             results.tasks.success++;
        } catch (e) {
             console.error("Task migrate error", e);
             results.tasks.fail++;
             results.errors.push(`Task ${task.title}: ${e.message}`);
        }
    }

    // 4. MIGRATE TRANSACTIONS
    const localTrans = JSON.parse(localStorage.getItem('transactions') || '[]');
    for (const t of localTrans) {
        try {
            // Mapping: 'Gelir' -> 'income', 'Gider' -> 'expense'
            const type = t.type === 'Gelir' ? 'income' : 'expense';
            // parse date 'dd.MM.yyyy'
            const parts = t.date.split('.');
            let isoDate = new Date().toISOString();
            if(parts.length === 3) {
                 isoDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString();
            }

            const { error } = await supabase.from('transactions').insert({
                date: isoDate,
                type: type,
                category: t.category,
                amount: parseFloat(t.amount.toString().replace('₺','').replace('.','').replace(',','.')),
                description: t.desc,
                payer: t.payer,
                project_id: null, // Hard to link back without strict name matching
                is_paid: true
            });

            if (error) throw error;
            results.transactions.success++;
        } catch (e) {
            results.transactions.fail++;
             results.errors.push(`Transaction ${t.desc}: ${e.message}`);
        }
    }

    return results;

  } catch (err) {
    console.error("Migration fatal error", err);
    throw err;
  }
};
