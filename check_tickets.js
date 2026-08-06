require('dotenv').config();
const { supabase } = require('./config/db');

async function checkTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, subject, status, assigned_technician_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) { console.error(error); process.exit(1); }

  console.log('=== Latest 5 tickets in DB ===');
  data.forEach(t => {
    console.log(`ID: ${t.id}`);
    console.log(`  Subject:  ${t.subject}`);
    console.log(`  Status:   ${t.status}`);
    console.log(`  Assigned: ${t.assigned_technician_id || 'NONE (unassigned)'}`);
    console.log(`  Created:  ${t.created_at}`);
    console.log('');
  });
  process.exit(0);
}

checkTickets();
