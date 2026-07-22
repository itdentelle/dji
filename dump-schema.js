
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function generateSchema() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
  const data = await res.json();
  
  const tables = data.definitions;
  let sql = '-- Auto-generated Supabase Schema for Trial/Error DB\n\n';

  for (const [tableName, schema] of Object.entries(tables)) {
    if (tableName.includes('_response') || tableName.includes('_request')) continue;

    sql += `CREATE TABLE ${tableName} (\n`;
    const cols = [];
    for (const [colName, colDef] of Object.entries(schema.properties)) {
      let type = 'text';
      if (colDef.type === 'integer' || colDef.format === 'integer') type = 'int8';
      else if (colDef.type === 'number' || colDef.format === 'numeric') type = 'numeric';
      else if (colDef.type === 'boolean') type = 'boolean';
      else if (colDef.format === 'timestamp with time zone' || colDef.format === 'timestamp without time zone') type = 'timestamp';
      else if (colDef.format === 'date') type = 'date';
      else if (colDef.format === 'uuid') type = 'uuid';
      else if (colDef.format === 'jsonb') type = 'jsonb';
      
      cols.push(`  ${colName} ${type}`);
    }
    sql += cols.join(',\n');
    sql += `\n);\n\n`;
  }

  fs.writeFileSync('schema-trial.sql', sql);
  console.log('File schema-trial.sql berhasil dibuat!');
}

generateSchema().catch(console.error);
