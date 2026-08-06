require('dotenv').config();
const { supabase } = require('./config/db');

async function seedUnassignedTickets() {
  try {
    // Get a valid Customer ID
    const { data: customers } = await supabase.from('customers').select('id').limit(1);
    if (!customers || customers.length === 0) {
      console.error('No customers found! Create a customer first.');
      process.exit(1);
    }
    const customerId = customers[0].id;

    // Get a valid Service Category ID
    const { data: categories } = await supabase.from('service_categories').select('id').limit(1);
    const categoryId = (categories && categories.length > 0) ? categories[0].id : null;

    const sampleTickets = [
      {
        customer_id: customerId,
        service_category_id: categoryId,
        subject: 'No Internet Connection (LOS Red Light)',
        description: 'Customer reports that their router has a blinking red light on LOS. Needs physical line inspection.',
        priority: 'high',
        status: 'open',
        source: 'app',
        assigned_technician_id: null,
        ai_estimated_resolution_hours: 4
      },
      {
        customer_id: customerId,
        service_category_id: categoryId,
        subject: 'Router Relocation Request',
        description: 'Customer wants to move the router from the living room to the second floor master bedroom. Requires new cabling.',
        priority: 'medium',
        status: 'open',
        source: 'phone',
        assigned_technician_id: null,
        ai_estimated_resolution_hours: 24
      },
      {
        customer_id: customerId,
        service_category_id: categoryId,
        subject: 'Slow Internet Speed (Below 10Mbps)',
        description: 'Customer is experiencing very slow internet speeds. Speed test shows 3Mbps download on a 50Mbps plan.',
        priority: 'medium',
        status: 'open',
        source: 'app',
        assigned_technician_id: null,
        ai_estimated_resolution_hours: 8
      }
    ];

    console.log('Inserting unassigned sample tickets...');
    const { data: inserted, error: insertErr } = await supabase
      .from('tickets')
      .insert(sampleTickets)
      .select();

    if (insertErr) {
      console.error('Failed to insert tickets:', insertErr);
    } else {
      console.log(`Successfully inserted ${inserted.length} unassigned sample ticket(s)!`);
      inserted.forEach(t => console.log(` - ${t.id} | ${t.subject}`));
    }
  } catch (err) {
    console.error('Script failed:', err);
  }
  process.exit(0);
}

seedUnassignedTickets();
