require('dotenv').config();
const { supabase } = require('./config/db');

async function removeSeededTickets() {
  try {
    // Find the technician
    const { data: tech } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'technician')
      .limit(1);

    if (!tech || tech.length === 0) {
      console.error('No technician found');
      process.exit(1);
    }

    const techId = tech[0].id;

    // Delete tickets that match our seeded subjects assigned to that technician
    const { data, error } = await supabase
      .from('tickets')
      .delete()
      .eq('assigned_technician_id', techId)
      .in('subject', [
        'No Internet Connection (LOS Red Light)',
        'Router Relocation Request'
      ])
      .select();

    if (error) {
      console.error('Failed to delete tickets:', error);
    } else {
      console.log(`Successfully deleted ${data.length} sample ticket(s).`);
    }
  } catch (err) {
    console.error('Script failed:', err);
  }
  process.exit(0);
}

removeSeededTickets();
