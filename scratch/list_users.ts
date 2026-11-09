import { supabase } from '../src/lib/supabase';

async function listUsers() {
  console.log('--- Staff PINs (staff_pins table) ---');
  const { data: staff, error: staffError } = await supabase.from('staff_pins').select('*');
  if (staffError) {
    console.error('Error fetching staff_pins:', staffError);
  } else {
    console.table(staff.map(s => ({
      id: s.id,
      name: s.name,
      pin: s.pin,
      role: s.role,
      active: s.is_active
    })));
  }

  // Also check if there's a profiles table or similar
  console.log('\n--- Profiles (profiles table) ---');
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
  if (profileError) {
    if (profileError.code === '42P01') {
       console.log('Profiles table does not exist.');
    } else {
       console.error('Error fetching profiles:', profileError);
    }
  } else {
    console.table(profiles);
  }
}

listUsers();
