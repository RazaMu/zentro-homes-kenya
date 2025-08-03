# Railway Database Implementation Guide for Zentro Homes

## Overview

I've successfully migrated your Zentro Homes website from Supabase to Railway PostgreSQL configuration. Here's what has been completed and what you need to implement next.

## ✅ Completed

1. **Railway Database Configuration** (`js/railway-config.js`)
   - Connection configuration for your Railway PostgreSQL database
   - Data transformation functions to match your actual database schema
   - Query management system designed for your table structure

2. **Updated Data Manager** (`js/shared-data-manager-railway.js`)
   - Railway-specific data management layer
   - Fallback to local data when database is unavailable
   - Real-time synchronization support

3. **Updated Admin Interface** (`admin/js/admin-integrated-railway.js`)
   - Railway-specific admin panel functionality
   - Property CRUD operations designed for your schema
   - Media upload handling for local filesystem storage

4. **Schema Compatibility**
   - Updated to work with your actual database columns:
     - `location_area`, `location_city`, `location_country`
     - `coordinates_lat`, `coordinates_lng`
     - `images`, `videos`, `features` as JSON fields
     - `youtube_url`, `virtual_tour_url`
     - SEO fields: `meta_title`, `meta_description`, `meta_keywords`
     - Publishing fields: `published`, `featured`, `views_count`

## 🔧 Next Steps Required

### 1. Backend API Implementation

Since browsers cannot directly connect to PostgreSQL databases for security reasons, you need to create a backend API.

#### Option A: Node.js/Express API (Recommended)

Create a simple Express.js server to handle database operations:

```bash
# Create backend directory
mkdir zentro-api
cd zentro-api
npm init -y
npm install express pg cors dotenv
```

#### Example API Structure (`server.js`):

```javascript
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Database configuration
const pool = new Pool({
  connectionString: 'postgresql://postgres:zyTlGMNtJQWCQBlaQvkTtbvJJwXBoveZ@turntable.proxy.rlwy.net:52389/railway',
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// Get all properties
app.get('/api/properties', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM properties WHERE published = true ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add property
app.post('/api/properties', async (req, res) => {
  try {
    const { title, type, status, price, location_area, location_city, bedrooms, bathrooms, description } = req.body;
    
    const result = await pool.query(
      'INSERT INTO properties (title, type, status, price, location_area, location_city, bedrooms, bathrooms, description, published) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *',
      [title, type, status, price, location_area, location_city, bedrooms, bathrooms, description]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search properties
app.get('/api/properties/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await pool.query(
      'SELECT * FROM properties WHERE (title ILIKE $1 OR location_area ILIKE $1 OR location_city ILIKE $1) AND published = true ORDER BY created_at DESC',
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

#### Option B: Railway Deployment

Deploy your API directly on Railway:

1. Create a new Railway project for your API
2. Connect it to your GitHub repository
3. Railway will automatically deploy your Express.js API
4. Update your frontend to use the Railway API URL

### 2. Update Frontend Configuration

Once your API is running, update the Railway manager:

```javascript
// In railway-config.js, replace executeQuery method with:
async executeQuery(query, params = []) {
  // Use your API endpoint
  const response = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params })
  });
  
  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }
  
  return await response.json();
}
```

### 3. File Upload Handling

For media uploads, you have several options:

#### Option A: Local File Storage
- Store uploaded files in `wp-content/uploads/2025/02/`
- Save file paths in the database
- Serve files statically from your web server

#### Option B: Cloud Storage (Recommended)
- Use AWS S3, Google Cloud Storage, or Cloudinary
- Store URLs in your database `images` JSON field
- Better performance and scalability

### 4. Database Optimization

Your current database is empty. Consider:

```sql
-- Add some sample data
INSERT INTO properties (
  title, type, status, price, currency, location_area, location_city, 
  bedrooms, bathrooms, parking, size, description, 
  images, amenities, published, featured
) VALUES (
  'Modern Villa in Karen',
  'Villa',
  'For Sale', 
  12500000,
  'KES',
  'Karen',
  'Nairobi',
  4, 3, 2, 250,
  'Beautiful modern villa with stunning views and premium finishes.',
  '{"main": "/uploads/villa1-main.jpg", "gallery": ["/uploads/villa1-1.jpg", "/uploads/villa1-2.jpg"]}',
  'Swimming Pool, Garden, Security, Parking',
  true,
  true
);
```

## 🧪 Testing

1. **Open the test file**: `railway_connection_test.html`
2. **Run the tests** to verify your configuration
3. **Check console logs** for detailed information

## 📁 File Structure

Your updated file structure:

```
zentrohomes.com/
├── js/
│   ├── railway-config.js (✅ Updated)
│   ├── shared-data-manager-railway.js (✅ New)
│   └── apartments-data.js (fallback data)
├── admin/
│   ├── index.html (✅ Updated to use Railway)
│   └── js/
│       └── admin-integrated-railway.js (✅ New)
└── api/ (⚠️ You need to create this)
    ├── server.js
    ├── package.json
    └── .env
```

## 🚀 Quick Start

1. **Create the backend API** (see Option A above)
2. **Start your API server**: `node server.js`
3. **Update the admin panel** to use your API endpoints
4. **Test the connection** using the test file
5. **Add sample data** to your Railway database

## 🔐 Security Notes

- Never expose database credentials in frontend code
- Use environment variables for sensitive data
- Implement proper authentication for admin operations
- Validate all input data before database insertion
- Use parameterized queries to prevent SQL injection

## 📞 Support

Your Railway database connection details:
- **Host**: turntable.proxy.rlwy.net:52389
- **Database**: railway
- **Schema**: Contains all the advanced fields you need

The frontend code is ready and configured for your actual database schema. You just need to implement the backend API to connect everything together.

## Next Steps Summary

1. ✅ Frontend configuration (completed)
2. ⚠️ Backend API implementation (you need to do this)
3. ⚠️ File upload system (you need to implement)
4. ⚠️ Add sample data to database (optional)
5. ⚠️ Deploy and test (final step)

Let me know if you need help with any of these steps!