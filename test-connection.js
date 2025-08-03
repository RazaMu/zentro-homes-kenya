const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Testing Railway Database Connection...');
console.log('📡 Database URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testConnection() {
  try {
    console.log('🔌 Connecting to Railway PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Database time:', result.rows[0].current_time);
    
    // Check tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Available tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check properties count
    try {
      const propertiesCount = await client.query('SELECT COUNT(*) FROM properties');
      console.log(`\n🏠 Properties in database: ${propertiesCount.rows[0].count}`);
    } catch (err) {
      console.log('⚠️ Properties table might not exist yet');
    }
    
    client.release();
    console.log('\n🎉 Database connection test successful!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();