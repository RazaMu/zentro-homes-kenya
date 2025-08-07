const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Sample properties data
const sampleProperties = [
  {
    title: 'Luxury Villa in Kilimani',
    type: 'Villa',
    status: 'For Sale',
    price: 283000000,
    location_area: 'Kilimani',
    location_city: 'Nairobi',
    bedrooms: 8,
    bathrooms: 8,
    parking: 6,
    size: 545,
    description: 'A stunning villa with panoramic city views, private pool, and luxury amenities. This exceptional property offers the perfect blend of modern luxury and comfort in one of Nairobi\'s most prestigious neighborhoods.',
    short_description: 'Stunning villa with panoramic city views and luxury amenities in prestigious Kilimani.',
    images: JSON.stringify([
      {
        url: 'wp-content/uploads/2025/02/A-scaled.jpg',
        alt: 'Villa exterior view',
        is_primary: true,
        display_order: 0
      },
      {
        url: 'wp-content/uploads/2025/02/B.jpg',
        alt: 'Swimming pool area',
        is_primary: false,
        display_order: 1
      }
    ]),
    amenities: JSON.stringify(['Swimming Pool', 'Garden', 'Security', 'Parking', 'Modern Kitchen', 'Balcony', 'Roof Terrace', 'City View']),
    featured: true,
    published: true
  },
  {
    title: 'Modern Apartment in Westlands',
    type: 'Apartment',
    status: 'For Rent',
    price: 450000,
    location_area: 'Westlands',
    location_city: 'Nairobi',
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    size: 120,
    description: 'Modern apartment with contemporary design and premium finishes. Located in the heart of Westlands with easy access to shopping and business districts.',
    short_description: 'Contemporary apartment in the heart of Westlands with premium finishes.',
    images: JSON.stringify([
      {
        url: 'wp-content/uploads/2025/02/unsplash.jpg',
        alt: 'Apartment living room',
        is_primary: true,
        display_order: 0
      }
    ]),
    amenities: JSON.stringify(['Gym', 'Swimming Pool', 'Security', 'Parking', 'Elevator', 'Air Conditioning']),
    featured: false,
    published: true
  },
  {
    title: 'Penthouse Suite in Karen',
    type: 'Penthouse',
    status: 'For Sale',
    price: 150000000,
    location_area: 'Karen',
    location_city: 'Nairobi',
    bedrooms: 4,
    bathrooms: 3,
    parking: 3,
    size: 280,
    description: 'Exclusive penthouse with breathtaking views of the Ngong Hills. Features high-end finishes, spacious terraces, and access to premium amenities.',
    short_description: 'Exclusive penthouse with breathtaking views of the Ngong Hills.',
    images: JSON.stringify([
      {
        url: 'wp-content/uploads/2025/02/top_img.png',
        alt: 'Penthouse terrace view',
        is_primary: true,
        display_order: 0
      }
    ]),
    amenities: JSON.stringify(['Private Elevator', 'Terrace', 'Security', 'Parking', 'Garden', 'Pool Access']),
    featured: true,
    published: true
  },
  {
    title: 'Family Condo in Lavington',
    type: 'Condo',
    status: 'For Rent',
    price: 320000,
    location_area: 'Lavington',
    location_city: 'Nairobi',
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    size: 95,
    description: 'Perfect family condo in the quiet neighborhood of Lavington. Close to schools, shopping centers, and public transport.',
    short_description: 'Perfect family condo in quiet Lavington neighborhood.',
    images: JSON.stringify([
      {
        url: 'wp-content/uploads/2025/02/B.png',
        alt: 'Condo interior',
        is_primary: true,
        display_order: 0
      }
    ]),
    amenities: JSON.stringify(['Security', 'Parking', 'Garden', 'Playground', 'Shopping Access']),
    featured: false,
    published: true
  }
];

// Sample contact inquiries
const sampleInquiries = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+254712345678',
    inquiry_type: 'viewing',
    subject: 'Property Viewing Request',
    message: 'I am interested in viewing the villa in Kilimani. Please let me know available times.',
    status: 'new',
    priority: 'normal'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    phone: '+254723456789',
    inquiry_type: 'general',
    subject: 'Rental Information',
    message: 'I would like more information about rental properties in Westlands area.',
    status: 'contacted',
    priority: 'normal'
  }
];

async function seedDatabase() {
  try {
    // console.log('🌱 Starting database seeding...');
    
    const client = await pool.connect();
    // console.log('🔌 Connected to Railway PostgreSQL database');
    
    try {
      // Clear existing data (optional - comment out if you want to preserve data)
      // console.log('🧹 Clearing existing data...');
      await client.query('DELETE FROM contact_inquiries');
      await client.query('DELETE FROM properties');
      await client.query('DELETE FROM admin_sessions');
      
      // Reset sequences
      await client.query('ALTER SEQUENCE properties_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE contact_inquiries_id_seq RESTART WITH 1');
      
      // Insert sample properties
      // console.log('🏠 Inserting sample properties...');
      for (const property of sampleProperties) {
        const query = `
          INSERT INTO properties (
            title, type, status, price, currency,
            location_area, location_city, location_country,
            bedrooms, bathrooms, parking, size, size_unit,
            description, short_description, images, amenities,
            featured, published, available
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20
          )
        `;
        
        const values = [
          property.title,
          property.type,
          property.status,
          property.price,
          'KES',
          property.location_area,
          property.location_city,
          'Kenya',
          property.bedrooms,
          property.bathrooms,
          property.parking,
          property.size,
          'm²',
          property.description,
          property.short_description,
          property.images,
          property.amenities,
          property.featured,
          property.published,
          true
        ];
        
        await client.query(query, values);
        // console.log(`  ✅ Added: ${property.title}`);
      }
      
      // Insert sample contact inquiries
      // console.log('📧 Inserting sample contact inquiries...');
      for (const inquiry of sampleInquiries) {
        const query = `
          INSERT INTO contact_inquiries (
            name, email, phone, inquiry_type, subject, message, status, priority
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        
        const values = [
          inquiry.name,
          inquiry.email,
          inquiry.phone,
          inquiry.inquiry_type,
          inquiry.subject,
          inquiry.message,
          inquiry.status,
          inquiry.priority
        ];
        
        await client.query(query, values);
        // console.log(`  ✅ Added inquiry from: ${inquiry.name}`);
      }
      
      // Verify seeded data
      const propertiesCount = await client.query('SELECT COUNT(*) FROM properties');
      const inquiriesCount = await client.query('SELECT COUNT(*) FROM contact_inquiries');
      
      // console.log('\n📊 Seeding summary:');
      // console.log(`  - Properties added: ${propertiesCount.rows[0].count}`);
      // console.log(`  - Inquiries added: ${inquiriesCount.rows[0].count}`);
      
      // Show sample data
      const sampleData = await client.query(`
        SELECT id, title, type, status, price, location_area, featured
        FROM properties 
        ORDER BY id 
        LIMIT 5
      `);
      
      // console.log('\n🏠 Sample properties:');
      sampleData.rows.forEach(row => {
        // console.log(`  - ${row.title} (${row.type}) - ${row.status} - KES ${row.price.toLocaleString()}`);
      });
      
    } finally {
      client.release();
    }
    
    // console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    // console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };