const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  const email = 'admin@dji.com';
  const password = 'password123'; // Guessing password or we can just try to see if auth fails
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }
  
  console.log('Logged in as:', authData.user.id);
  
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('full_name, employee_id, role')
    .eq('id', authData.user.id)
    .single();
    
  if (profileError) {
    console.error('Profile fetch failed:', profileError);
  } else {
    console.log('Profile fetched:', profile);
  }
}

testLogin();
