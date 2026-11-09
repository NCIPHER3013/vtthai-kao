import { supabase } from '../src/lib/supabase';

async function seedAdmin() {
  console.log('Checking for existing Admin...');
  const { data: existing, error: checkError } = await supabase
    .from('staff_pins')
    .select('*')
    .eq('role', 'ADMIN')
    .limit(1)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking for admin:', checkError);
    return;
  }

  if (existing) {
    console.log('Admin already exists:', existing.name);
  } else {
    console.log('Creating System Admin...');
    const { error: insertError } = await supabase
      .from('staff_pins')
      .insert([
        { name: 'System Admin', pin: '0000', role: 'ADMIN' }
      ]);

    if (insertError) {
      console.error('Error creating admin:', insertError);
    } else {
      console.log('System Admin created successfully (PIN: 0000)');
    }
  }
}

seedAdmin();
