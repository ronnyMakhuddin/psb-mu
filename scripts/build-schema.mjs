// Menyalin database/schema.sql ke api/_lib/schema.js agar ikut ter-deploy bersama API.
// Jalankan setiap kali schema.sql diubah: npm run schema
import fs from 'node:fs';
const sql = fs.readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf8');
fs.writeFileSync(new URL('../api/_lib/schema.js', import.meta.url),
  `// FILE OTOMATIS dari database/schema.sql (npm run schema). Jangan diedit langsung.\nexport const SCHEMA_SQL = ${JSON.stringify(sql)};\n`);
console.log('api/_lib/schema.js diperbarui');
