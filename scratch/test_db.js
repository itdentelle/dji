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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing env vars!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function testUpload() {
  // A tiny valid 1x1 transparent PNG file hex
  const pngHex = "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6364f8ff3f000500027f023412840000000049454e44ae426082";
  const dummyFile = Buffer.from(pngHex, 'hex');
  const fileName = `test_${Date.now()}.png`;
  const filePath = `mesin/${fileName}`;

  console.log(`Trying to upload dummy PNG file to 'production-photos' as anonymous/public...`);
  const { data, error } = await supabase.storage
    .from('production-photos')
    .upload(filePath, dummyFile, {
      contentType: 'image/png'
    });

  if (error) {
    console.error("UPLOAD FAILED:", error);
  } else {
    console.log("UPLOAD SUCCESS! Path:", data.path);
    const { data: publicUrlData } = supabase.storage
      .from('production-photos')
      .getPublicUrl(filePath);
    console.log("Public URL:", publicUrlData.publicUrl);
  }
}

testUpload();
