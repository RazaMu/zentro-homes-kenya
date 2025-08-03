const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('🚀 Starting Railway database migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'railway_database_schema_fixed.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Schema file loaded successfully');
    
    // Connect to database
    const client = await pool.connect();
    console.log('🔌 Connected to Railway PostgreSQL database');
    
    try {
      // Run the migration
      console.log('⚡ Executing database schema...');
      await client.query(schema);
      console.log('✅ Database schema created successfully');
      
      // Verify tables were created
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('\n📊 Created tables:');
      tables.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
      
      // Check if sample data was inserted
      const propertiesCount = await client.query('SELECT COUNT(*) FROM properties');
      const contactsCount = await client.query('SELECT COUNT(*) FROM contact_inquiries');
      const adminCount = await client.query('SELECT COUNT(*) FROM admin_users');
      
      console.log('\n📈 Data summary:');
      console.log(`  - Properties: ${propertiesCount.rows[0].count}`);
      console.log(`  - Contact inquiries: ${contactsCount.rows[0].count}`);
      console.log(`  - Admin users: ${adminCount.rows[0].count}`);
      
    } finally {
      client.release();
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };