# RAILWAY.COM MIGRATION GUIDE FOR ZENTRO HOMES
## Complete Migration from Supabase to Railway.com
### Database + Deployment + File Storage Solution

================================================================================
## TABLE OF CONTENTS
================================================================================

1. [Overview & Architecture](#overview--architecture)
2. [Railway Account Setup](#railway-account-setup)
3. [PostgreSQL Database Setup](#postgresql-database-setup)
4. [Database Schema Migration](#database-schema-migration)
5. [File Storage Solution](#file-storage-solution)
6. [Code Migration & Updates](#code-migration--updates)
7. [Deployment Configuration](#deployment-configuration)
8. [Environment Variables Setup](#environment-variables-setup)
9. [Domain & SSL Configuration](#domain--ssl-configuration)
10. [Data Migration Process](#data-migration-process)
11. [Testing & Verification](#testing--verification)
12. [Cost Analysis & Optimization](#cost-analysis--optimization)
13. [Troubleshooting Guide](#troubleshooting-guide)

================================================================================
## OVERVIEW & ARCHITECTURE
================================================================================

### Current Stack (Supabase):
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage Buckets
- **Authentication**: Supabase Auth
- **Hosting**: Local/Static hosting
- **Admin Panel**: Client-side with Supabase SDK

### New Stack (Railway):
- **Database**: Railway PostgreSQL
- **Storage**: Cloudinary (recommended) or AWS S3
- **Authentication**: Custom JWT or Auth0 integration
- **Hosting**: Railway deployment
- **Admin Panel**: Server-side with Express.js + PostgreSQL
- **CDN**: Cloudinary or CloudFlare

### Migration Benefits:
- **Unified Platform**: Database + hosting in one place
- **Better Performance**: Railway's global infrastructure
- **Cost Efficiency**: More predictable pricing
- **Scalability**: Automatic scaling capabilities
- **DevOps**: Integrated CI/CD pipeline
- **Monitoring**: Built-in application monitoring

================================================================================
## RAILWAY ACCOUNT SETUP
================================================================================

### Step 1: Create Railway Account

1. **Go to Railway.app**
   - Visit https://railway.app
   - Click "Start a New Project"

2. **Sign Up Options**
   - **GitHub** (Recommended): Connect your GitHub account
   - **Discord**: Use Discord OAuth
   - **Email**: Traditional email signup

3. **Verify Account**
   - Complete email verification
   - Set up billing (credit card required even for free tier)

4. **Initial Setup**
   - Choose a username
   - Complete onboarding tutorial
   - Familiarize yourself with the dashboard

### Step 2: Understanding Railway Pricing

**Free Tier Limits:**
- $5 USD free credits per month
- Database: PostgreSQL up to 1GB
- Deployment: 500 hours execution time
- Bandwidth: 100GB outbound
- Memory: 512MB RAM per service

**Pro Plan:** $20/month
- $20 worth of usage credits included
- Higher resource limits
- Priority support
- Custom domains

================================================================================
## POSTGRESQL DATABASE SETUP
================================================================================

### Step 1: Create PostgreSQL Database

1. **From Railway Dashboard**
   - Click "New Project"
   - Select "Provision PostgreSQL"
   - Choose database name: `zentro-homes-db`

2. **Database Configuration**
   ```
   Database Name: zentro-homes-db
   Environment: production
   Region: us-west1 (or closest to your users)
   ```

3. **Get Connection Details**
   - Go to PostgreSQL service in your project
   - Click "Connect" tab
   - Copy connection details:


     ```
  PGPASSWORD=zyTlGMNtJQWCQBlaQvkTtbvJJwXBoveZ psql -h turntable.proxy.rlwy.net -U postgres -p 52389 -d railway

4. **Connection String Format**
   ```
   postgresql://postgres:zyTlGMNtJQWCQBlaQvkTtbvJJwXBoveZ@turntable.proxy.rlwy.net:52389/railway
   ```

### Step 2: Database Access Setup

1. **Railway CLI Installation**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login

   8c12d78f-5867-4c58-9ada-a4a2ea1epsql0285
   
   # Link to your project
   railway link [project-id]
   ```

2. **Direct Database Access**
   ```bash
   # Connect to database via CLI
   railway connect postgres
   
   # Or use external tools like pgAdmin, DBeaver
   # Use the connection details from Railway dashboard
   ```

================================================================================
## DATABASE SCHEMA MIGRATION
================================================================================

### Step 1: Create Migration SQL

Create `railway_database_schema.sql`:

```sql
-- ================================================================================
-- RAILWAY POSTGRESQL SCHEMA FOR ZENTRO HOMES
-- Optimized for Railway.app deployment
-- ================================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Basic property information
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Villa', 'Apartment', 'Penthouse', 'Condo')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('For Sale', 'For Rent')),
    price BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    
    -- Location information
    location_area VARCHAR(100) NOT NULL,
    location_city VARCHAR(100) NOT NULL,
    location_country VARCHAR(100) DEFAULT 'Kenya',
    coordinates_lat DECIMAL(10, 8),
    coordinates_lng DECIMAL(11, 8),
    
    -- Property features
    bedrooms INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    parking INTEGER DEFAULT 0,
    size INTEGER NOT NULL,
    size_unit VARCHAR(10) DEFAULT 'm²',
    year_built INTEGER,
    furnished BOOLEAN DEFAULT true,
    
    -- Content
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    
    -- Media - using JSON for flexibility
    images JSONB DEFAULT '[]'::jsonb,
    videos JSONB DEFAULT '[]'::jsonb,
    virtual_tour_url TEXT,
    
    -- Amenities and features
    amenities JSONB DEFAULT '[]'::jsonb,
    features JSONB DEFAULT '{}'::jsonb,
    
    -- SEO and metadata
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT[],
    
    -- Status and visibility
    available BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    published BOOLEAN DEFAULT true,
    views_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Search optimization
    search_vector tsvector
);

-- Create contact inquiries table
CREATE TABLE IF NOT EXISTS contact_inquiries (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Contact information
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Inquiry details
    property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
    inquiry_type VARCHAR(50) DEFAULT 'general',
    subject VARCHAR(255),
    message TEXT NOT NULL,
    
    -- Contact preferences
    preferred_contact_method VARCHAR(20) DEFAULT 'email',
    preferred_contact_time VARCHAR(50),
    
    -- Admin management
    status VARCHAR(20) DEFAULT 'new',
    priority VARCHAR(10) DEFAULT 'normal',
    assigned_to VARCHAR(100),
    admin_notes TEXT,
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'website',
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contacted_at TIMESTAMP WITH TIME ZONE
);

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- User information
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Role and permissions
    role VARCHAR(20) DEFAULT 'admin',
    permissions JSONB DEFAULT '{}'::jsonb,
    
    -- Account status
    active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    
    -- Security
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Session data
    admin_user_id INTEGER REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    
    -- Session status
    active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS website_analytics (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Event information
    event_type VARCHAR(50) NOT NULL,
    page_url TEXT,
    property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Session data
    session_id VARCHAR(100),
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    
    -- Event data
    event_data JSONB DEFAULT '{}'::jsonb,
    duration INTEGER,
    
    -- Geographic data
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Device information
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================================

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location_city, location_area);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);
CREATE INDEX IF NOT EXISTS idx_properties_published ON properties(published);
CREATE INDEX IF NOT EXISTS idx_properties_created ON properties(created_at);
CREATE INDEX IF NOT EXISTS idx_properties_search ON properties USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_properties_uuid ON properties(uuid);
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);

-- Contact inquiries indexes
CREATE INDEX IF NOT EXISTS idx_contacts_property ON contact_inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contact_inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contact_inquiries(email);

-- Admin users indexes
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_active ON admin_users(active);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_admin ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_event ON website_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_property ON website_analytics(property_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON website_analytics(created_at);

-- ================================================================================
-- TRIGGERS AND FUNCTIONS
-- ================================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at 
    BEFORE UPDATE ON properties 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contact_inquiries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at 
    BEFORE UPDATE ON admin_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate property slug
CREATE OR REPLACE FUNCTION generate_property_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(replace(trim(NEW.title), ' ', '-')) || '-' || NEW.id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automatic slug generation
CREATE TRIGGER generate_property_slug_trigger
    BEFORE INSERT OR UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION generate_property_slug();

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_property_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.location_area, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.location_city, '')), 'C');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for search vector updates
CREATE TRIGGER update_property_search_vector_trigger
    BEFORE INSERT OR UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_property_search_vector();

-- ================================================================================
-- SAMPLE DATA
-- ================================================================================

-- Insert sample admin user (password: admin123)
INSERT INTO admin_users (name, email, password_hash, role, active, email_verified) VALUES 
('Admin User', 'admin@zentrohomes.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewJaE2/9S8UzJxkm', 'admin', true, true);

-- Insert sample properties
INSERT INTO properties (
    title, type, status, price, location_area, location_city,
    bedrooms, bathrooms, parking, size, description, short_description,
    images, amenities, featured, published
) VALUES 
(
    'Luxury Villa in Kilimani',
    'Villa',
    'For Sale',
    283000000,
    'Kilimani',
    'Nairobi',
    8,
    8,
    6,
    545,
    'A stunning villa with panoramic city views, private pool, and luxury amenities. This exceptional property offers the perfect blend of modern luxury and comfort in one of Nairobi''s most prestigious neighborhoods.',
    'Stunning villa with panoramic city views and luxury amenities in prestigious Kilimani.',
    '[
        {
            "url": "https://res.cloudinary.com/zentro-homes/image/upload/v1234567890/villa1_main.jpg",
            "alt": "Villa exterior view",
            "is_primary": true,
            "display_order": 0
        },
        {
            "url": "https://res.cloudinary.com/zentro-homes/image/upload/v1234567890/villa1_pool.jpg",
            "alt": "Swimming pool area",
            "is_primary": false,
            "display_order": 1
        }
    ]',
    '["Swimming Pool", "Garden", "Security", "Parking", "Modern Kitchen", "Balcony", "Roof Terrace", "City View"]',
    true,
    true
),
(
    'Modern Apartment in Westlands',
    'Apartment',
    'For Rent',
    450000,
    'Westlands',
    'Nairobi',
    3,
    2,
    2,
    120,
    'Modern apartment with contemporary design and premium finishes. Located in the heart of Westlands with easy access to shopping and business districts.',
    'Contemporary apartment in the heart of Westlands with premium finishes.',
    '[
        {
            "url": "https://res.cloudinary.com/zentro-homes/image/upload/v1234567890/apt1_main.jpg",
            "alt": "Apartment living room",
            "is_primary": true,
            "display_order": 0
        }
    ]',
    '["Gym", "Swimming Pool", "Security", "Parking", "Elevator", "Air Conditioning"]',
    false,
    true
);

-- ================================================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================================================

-- Active properties view
CREATE OR REPLACE VIEW active_properties AS
SELECT 
    id, uuid, title, slug, type, status, price, currency,
    location_area, location_city, location_country,
    bedrooms, bathrooms, parking, size, size_unit,
    short_description, images, amenities,
    featured, views_count, created_at
FROM properties 
WHERE published = true AND available = true
ORDER BY featured DESC, created_at DESC;

-- Property search view
CREATE OR REPLACE VIEW searchable_properties AS
SELECT 
    id, uuid, title, slug, type, status, price,
    location_area, location_city, bedrooms, bathrooms,
    images, featured, search_vector
FROM properties 
WHERE published = true AND available = true;

-- Admin dashboard stats
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    COUNT(*) as total_properties,
    COUNT(CASE WHEN status = 'For Sale' THEN 1 END) as for_sale_count,
    COUNT(CASE WHEN status = 'For Rent' THEN 1 END) as for_rent_count,
    COUNT(CASE WHEN featured = true THEN 1 END) as featured_count,
    AVG(price) as average_price,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month,
    SUM(views_count) as total_views
FROM properties 
WHERE published = true AND available = true;
```

### Step 2: Run Migration

1. **Connect to Railway Database**
   ```bash
   # Using Railway CLI
   railway connect postgres
   
   # Or use the connection string with psql
   psql "postgresql://postgres:[password]@containers-us-west-[xxx].railway.app:[port]/railway"
   ```

2. **Execute Schema**
   ```sql
   -- Copy and paste the SQL schema above, or
   \i railway_database_schema.sql
   ```

3. **Verify Tables**
   ```sql
   -- List all tables
   \dt
   
   -- Check properties table structure
   \d properties
   
   -- Verify sample data
   SELECT title, type, status FROM properties;
   ```

================================================================================
## FILE STORAGE SOLUTION
================================================================================

### Option 1: Cloudinary (Recommended)

**Why Cloudinary:**
- Generous free tier (25GB storage, 25GB bandwidth)
- Automatic image optimization
- Built-in CDN
- Image transformations on-the-fly
- Video support
- Easy integration

**Setup Steps:**

1. **Create Cloudinary Account**
   - Go to https://cloudinary.com
   - Sign up for free account
   - Get your credentials:
     ```
     Cloud Name: zentro-homes
     API Key: [your-api-key]
     API Secret: [your-api-secret]
     ```

2. **Configure Upload Presets**
   - Go to Settings > Upload
   - Create upload preset: `zentro_properties`
   - Settings:
     ```
     Mode: Unsigned
     Folder: properties
     Transformation: Auto quality, Auto format
     Allowed formats: jpg, png, webp, gif, mp4, mov
     Max file size: 10MB for images, 100MB for videos
     ```

3. **JavaScript SDK Integration**
   ```html
   <!-- Add to your HTML -->
   <script src="https://widget.cloudinary.com/v2.0/global/all.js"></script>
   ```

### Option 2: AWS S3 + CloudFront

**For more control and enterprise needs:**

1. **Create S3 Bucket**
   ```
   Bucket name: zentro-homes-media
   Region: us-east-1
   Public read access: Yes
   ```

2. **Set up CloudFront Distribution**
   - Point to S3 bucket
   - Enable compression
   - Custom domain (optional)

================================================================================
## CODE MIGRATION & UPDATES
================================================================================

### Step 1: Create Railway Configuration

Create `railway.json`:
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 2: Create Express.js Backend

Create `server.js`:
```javascript
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'zentrohomes.com')));

// API Routes
app.use('/api/properties', require('./routes/properties'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/admin', require('./routes/admin'));

// Serve the website
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'zentrohomes.com', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 3: Create API Routes

Create `routes/properties.js`:
```javascript
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get all properties
router.get('/', async (req, res) => {
  try {
    const { type, status, location, min_price, max_price, bedrooms } = req.query;
    
    let query = 'SELECT * FROM active_properties WHERE 1=1';
    const params = [];
    
    if (type) {
      query += ' AND type = $' + (params.length + 1);
      params.push(type);
    }
    
    if (status) {
      query += ' AND status = $' + (params.length + 1);
      params.push(status);
    }
    
    if (location) {
      query += ' AND location_city ILIKE $' + (params.length + 1);
      params.push(`%${location}%`);
    }
    
    if (min_price) {
      query += ' AND price >= $' + (params.length + 1);
      params.push(min_price);
    }
    
    if (max_price) {
      query += ' AND price <= $' + (params.length + 1);
      params.push(max_price);
    }
    
    if (bedrooms) {
      query += ' AND bedrooms = $' + (params.length + 1);
      params.push(bedrooms);
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get property by ID or slug
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    let query;
    if (isNaN(identifier)) {
      // It's a slug
      query = 'SELECT * FROM properties WHERE slug = $1 AND published = true';
    } else {
      // It's an ID
      query = 'SELECT * FROM properties WHERE id = $1 AND published = true';
    }
    
    const result = await pool.query(query, [identifier]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Update view count
    await pool.query('UPDATE properties SET views_count = views_count + 1 WHERE id = $1', [result.rows[0].id]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search properties
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    
    const query = `
      SELECT *, ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
      FROM searchable_properties 
      WHERE search_vector @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, featured DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query, [term]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
```

### Step 4: Update Frontend Code

Create `public/js/railway-client.js`:
```javascript
// Railway API Client for Zentro Homes
class RailwayClient {
  constructor() {
    this.baseUrl = window.location.origin + '/api';
  }

  // Get all properties with filters
  async getProperties(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `${this.baseUrl}/properties${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  }

  // Get property by ID or slug
  async getProperty(identifier) {
    try {
      const response = await fetch(`${this.baseUrl}/properties/${identifier}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  }

  // Search properties
  async searchProperties(term) {
    try {
      const response = await fetch(`${this.baseUrl}/properties/search/${encodeURIComponent(term)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching properties:', error);
      throw error;
    }
  }

  // Submit contact inquiry
  async submitInquiry(data) {
    try {
      const response = await fetch(`${this.baseUrl}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      throw error;
    }
  }
}

// Initialize global client
const railwayClient = new RailwayClient();

// Make it globally available
window.railwayClient = railwayClient;
```

### Step 5: Update Package.json

Create `package.json`:
```json
{
  "name": "zentro-homes-railway",
  "version": "1.0.0",
  "description": "Zentro Homes Real Estate Website on Railway",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'No build step required for static site'",
    "migrate": "node scripts/migrate.js"
  },
  "keywords": ["real estate", "kenya", "railway", "nodejs"],
  "author": "Zentro Homes",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.7.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "dotenv": "^16.1.4",
    "multer": "^1.4.5-lts.1",
    "cloudinary": "^1.37.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

================================================================================
## DEPLOYMENT CONFIGURATION
================================================================================

### Step 1: Prepare for Deployment

1. **Project Structure**
   ```
   zentro-homes-railway/
   ├── server.js
   ├── package.json
   ├── railway.json
   ├── routes/
   │   ├── properties.js
   │   ├── contacts.js
   │   └── admin.js
   ├── middleware/
   │   ├── auth.js
   │   └── upload.js
   ├── zentrohomes.com/
   │   ├── index.html
   │   ├── css/
   │   ├── js/
   │   └── admin/
   └── scripts/
       └── migrate.js
   ```

2. **Create Procfile** (optional):
   ```
   web: node server.js
   ```

### Step 2: Deploy to Railway

1. **Connect GitHub Repository**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `zentro-homes-real-estate` repository

2. **Configure Build Settings**
   ```
   Build Command: npm install
   Start Command: npm start
   Root Directory: (leave empty if app is in root)
   ```

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   JWT_SECRET=your-jwt-secret-key
   ```

4. **Deploy**
   - Click "Deploy Now"
   - Monitor build logs
   - Check for successful deployment

================================================================================
## ENVIRONMENT VARIABLES SETUP
================================================================================

### Step 1: Railway Environment Variables

In Railway Dashboard > Project > Variables:

```bash
# Database (automatically provided by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Application
NODE_ENV=production
PORT=3000

# 
 Configuration
CLOUDINARY_CLOUD_NAME=zentro-homes
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# JWT for Admin Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Admin Configuration
ADMIN_EMAIL=admin@zentrohomes.com
ADMIN_PASSWORD=change-this-password

# CORS Origins (for production)
ALLOWED_ORIGINS=https://your-custom-domain.com,https://zentro-homes.up.railway.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Limits
MAX_FILE_SIZE=10485760
MAX_FILES_PER_UPLOAD=10

# Email Configuration (for contact forms)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Analytics (optional)
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
```

### Step 2: Local Development Environment

Create `.env.local`:
```bash
# Local development environment
NODE_ENV=development
PORT=3000

# Local database (for development)
DATABASE_URL=postgresql://postgres:password@localhost:5432/zentro_homes_dev

# Cloudinary (same as production)
CLOUDINARY_CLOUD_NAME=zentro-homes
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Local JWT secret
JWT_SECRET=local-development-secret

# Local admin
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD=admin123

# Disable rate limiting in development
RATE_LIMIT_ENABLED=false
```

================================================================================
## DOMAIN & SSL CONFIGURATION
================================================================================

### Step 1: Custom Domain Setup

1. **In Railway Dashboard**
   - Go to your project
   - Click on the web service
   - Go to "Settings" tab
   - Find "Domains" section
   - Click "Custom Domain"
   - Enter your domain: `www.zentrohomes.com`

2. **DNS Configuration**
   Add these DNS records to your domain provider:
   ```
   Type: CNAME
   Name: www
   Value: zentro-homes-railway.up.railway.app
   
   Type: A (for root domain)
   Name: @
   Value: [Railway IP - provided in dashboard]
   ```

3. **SSL Certificate**
   - Railway automatically provides SSL certificates
   - Usually takes 5-10 minutes to provision
   - Verify at https://www.zentrohomes.com

### Step 2: Redirect Configuration

Add to your `server.js`:
```javascript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Redirect root domain to www
app.use((req, res, next) => {
  if (req.headers.host === 'zentrohomes.com') {
    res.redirect(301, `https://www.zentrohomes.com${req.url}`);
  } else {
    next();
  }
});
```

================================================================================
## DATA MIGRATION PROCESS
================================================================================

### Step 1: Export Data from Supabase

Create `scripts/export-supabase.js`:
```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'your-supabase-url',
  'your-supabase-service-key'
);

async function exportData() {
  try {
    // Export properties
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*');
    
    if (propError) throw propError;
    
    // Export contacts
    const { data: contacts, error: contactError } = await supabase
      .from('contact_inquiries')
      .select('*');
    
    if (contactError) throw contactError;
    
    // Save to files
    fs.writeFileSync('exports/properties.json', JSON.stringify(properties, null, 2));
    fs.writeFileSync('exports/contacts.json', JSON.stringify(contacts, null, 2));
    
    console.log(`Exported ${properties.length} properties`);
    console.log(`Exported ${contacts.length} contacts`);
    
  } catch (error) {
    console.error('Export failed:', error);
  }
}

exportData();
```

### Step 2: Import Data to Railway

Create `scripts/import-railway.js`:
```javascript
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importData() {
  try {
    // Read exported data
    const properties = JSON.parse(fs.readFileSync('exports/properties.json', 'utf8'));
    const contacts = JSON.parse(fs.readFileSync('exports/contacts.json', 'utf8'));
    
    // Import properties
    for (const property of properties) {
      const query = `
        INSERT INTO properties (
          title, type, status, price, currency,
          location_area, location_city, location_country,
          bedrooms, bathrooms, parking, size, size_unit,
          description, images, amenities, year_built,
          furnished, available, featured, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      `;
      
      const values = [
        property.title,
        property.type,
        property.status,
        property.price,
        property.currency,
        property.location_area,
        property.location_city,
        property.location_country,
        property.bedrooms,
        property.bathrooms,
        property.parking,
        property.size,
        property.size_unit,
        property.description,
        JSON.stringify(property.images || []),
        JSON.stringify(property.amenities || []),
        property.year_built,
        property.furnished,
        property.available,
        property.featured,
        property.created_at
      ];
      
      await pool.query(query, values);
    }
    
    // Import contacts
    for (const contact of contacts) {
      const query = `
        INSERT INTO contact_inquiries (
          name, email, phone, property_id, inquiry_type,
          subject, message, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      const values = [
        contact.name,
        contact.email,
        contact.phone,
        contact.property_id,
        contact.inquiry_type,
        contact.subject,
        contact.message,
        contact.status,
        contact.created_at
      ];
      
      await pool.query(query, values);
    }
    
    console.log(`Imported ${properties.length} properties`);
    console.log(`Imported ${contacts.length} contacts`);
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

importData();
```

### Step 3: Run Migration

```bash
# Install dependencies
npm install @supabase/supabase-js

# Create exports directory
mkdir exports

# Export from Supabase
node scripts/export-supabase.js

# Import to Railway (make sure DATABASE_URL is set)
node scripts/import-railway.js
```

================================================================================
## TESTING & VERIFICATION
================================================================================

### Step 1: Functionality Testing

1. **Database Connection**
   ```bash
   # Test database connection
   railway connect postgres
   
   # Verify tables exist
   \dt
   
   # Check data
   SELECT COUNT(*) FROM properties;
   SELECT COUNT(*) FROM contact_inquiries;
   ```

2. **API Endpoints**
   ```bash
   # Test property API
   curl https://your-app.up.railway.app/api/properties
   
   # Test search
   curl https://your-app.up.railway.app/api/properties/search/villa
   
   # Test specific property
   curl https://your-app.up.railway.app/api/properties/1
   ```

3. **Website Loading**
   - Visit https://your-app.up.railway.app
   - Check all pages load correctly
   - Verify properties display
   - Test search functionality
   - Test contact forms

### Step 2: Performance Testing

1. **Load Testing**
   ```bash
   # Install artillery
   npm install -g artillery
   
   # Create test config
   echo "config:
     target: 'https://your-app.up.railway.app'
     phases:
       - duration: 60
         arrivalRate: 10
   scenarios:
     - name: 'Website browsing'
       flow:
         - get:
             url: '/'
         - get:
             url: '/api/properties'
   " > load-test.yml
   
   # Run test
   artillery run load-test.yml
   ```

2. **Database Performance**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   
   -- Check index usage
   SELECT 
     schemaname,
     tablename,
     indexname,
     idx_scan,
     idx_tup_read,
     idx_tup_fetch
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;
   ```

### Step 3: Security Testing

1. **SQL Injection Testing**
   - Test API endpoints with malicious inputs
   - Verify parameterized queries are used
   - Check error handling doesn't expose sensitive info

2. **Rate Limiting**
   - Test API rate limits
   - Verify protection against DDoS

3. **HTTPS Configuration**
   - Verify SSL certificate
   - Check HTTPS redirects
   - Test security headers

================================================================================
## COST ANALYSIS & OPTIMIZATION
================================================================================

### Step 1: Railway Cost Breakdown

**Free Tier Usage:**
- Database: PostgreSQL (1GB storage)
- Web Service: 512MB RAM, shared CPU
- Bandwidth: 100GB/month
- Execution Time: 500 hours/month

**Estimated Monthly Costs (Pro Plan):**
```
Database (1GB): ~$5/month
Web Service (512MB): ~$5/month
Bandwidth (100GB): ~$2/month
Total: ~$12/month (within $20 credit limit)
```

**Cost Optimization Tips:**
1. **Database Optimization**
   - Regular VACUUM and ANALYZE
   - Optimize queries with EXPLAIN
   - Archive old data

2. **Image Optimization**
   - Use Cloudinary auto-optimization
   - Implement lazy loading
   - Use WebP format

3. **Caching Strategy**
   - Implement Redis for session storage
   - Use CDN for static assets
   - Add HTTP caching headers

### Step 2: Monitoring Setup

1. **Railway Metrics**
   - Monitor CPU and memory usage
   - Track database connections
   - Watch deployment logs

2. **Application Monitoring**
   ```javascript
   // Add to server.js
   const promClient = require('prom-client');
   
   // Create metrics
   const httpRequestDuration = new promClient.Histogram({
     name: 'http_request_duration_seconds',
     help: 'Duration of HTTP requests in seconds',
     labelNames: ['method', 'route', 'status']
   });
   
   // Middleware to collect metrics
   app.use((req, res, next) => {
     const start = Date.now();
     
     res.on('finish', () => {
       const duration = (Date.now() - start) / 1000;
       httpRequestDuration
         .labels(req.method, req.route?.path || req.path, res.statusCode)
         .observe(duration);
     });
     
     next();
   });
   ```

================================================================================
## TROUBLESHOOTING GUIDE
================================================================================

### Common Issues and Solutions

1. **Database Connection Failed**
   ```
   Error: Connection refused
   
   Solution:
   - Check DATABASE_URL environment variable
   - Verify database service is running
   - Check firewall settings
   ```

2. **Build Failed**
   ```
   Error: npm install failed
   
   Solution:
   - Check package.json syntax
   - Verify Node.js version compatibility
   - Clear build cache in Railway
   ```

3. **Static Files Not Loading**
   ```
   Error: 404 on CSS/JS files
   
   Solution:
   - Verify express.static middleware
   - Check file paths in HTML
   - Ensure files are in correct directory
   ```

4. **Database Migration Issues**
   ```
   Error: Syntax error in SQL
   
   Solution:
   - Check PostgreSQL version compatibility
   - Verify column data types
   - Run migrations step by step
   ```

5. **Image Upload Not Working**
   ```
   Error: Cloudinary upload failed
   
   Solution:
   - Verify API credentials
   - Check file size limits
   - Verify upload preset configuration
   ```

### Performance Issues

1. **Slow Database Queries**
   ```sql
   -- Find slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   WHERE mean_time > 1000 
   ORDER BY mean_time DESC;
   
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY idx_missing 
   ON table_name (column_name);
   ```

2. **High Memory Usage**
   ```javascript
   // Monitor memory usage
   setInterval(() => {
     const used = process.memoryUsage();
     console.log('Memory usage:', {
       rss: Math.round(used.rss / 1024 / 1024) + 'MB',
       heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
       heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB'
     });
   }, 10000);
   ```

3. **Connection Pool Issues**
   ```javascript
   // Optimize pool settings
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20, // max number of clients
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

================================================================================
## MIGRATION CHECKLIST
================================================================================

### Pre-Migration
- [ ] Railway account created and verified
- [ ] PostgreSQL database provisioned
- [ ] Cloudinary account set up
- [ ] Database schema created
- [ ] Sample data inserted and verified

### Code Migration
- [ ] Express.js server created
- [ ] API routes implemented
- [ ] Frontend code updated for new API
- [ ] Package.json configured
- [ ] Environment variables defined

### Deployment
- [ ] GitHub repository connected to Railway
- [ ] Environment variables configured
- [ ] Successful deployment completed
- [ ] Website accessible via Railway URL

### Data Migration
- [ ] Supabase data exported
- [ ] Data successfully imported to Railway
- [ ] Data integrity verified
- [ ] Image URLs updated

### Testing
- [ ] All website pages load correctly
- [ ] Property search and filtering works
- [ ] Contact forms submit successfully
- [ ] Admin panel functional
- [ ] Performance metrics acceptable

### Production Setup
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Documentation updated

### Post-Migration
- [ ] DNS propagated
- [ ] Search engine indexing updated
- [ ] Analytics tracking verified
- [ ] Performance optimized
- [ ] Supabase account deactivated (optional)

================================================================================
## CONCLUSION
================================================================================

This migration guide provides a complete roadmap for moving your Zentro Homes project from Supabase to Railway.com. The new architecture will provide:

- **Better Performance**: Unified platform with optimized database queries
- **Cost Efficiency**: Predictable pricing with Railway's credit system
- **Scalability**: Easy horizontal and vertical scaling options
- **Maintainability**: Simplified deployment and monitoring
- **Professional Setup**: Production-ready configuration

The migration involves significant changes but results in a more robust, scalable, and maintainable real estate platform suitable for growing your business in the Kenyan market.

**Next Steps:**
1. Follow this guide step by step
2. Test thoroughly before going live
3. Monitor performance and optimize as needed
4. Plan for future enhancements and scaling

**Support Resources:**
- Railway Documentation: https://docs.railway.app
- Express.js Guide: https://expressjs.com/en/guide/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Cloudinary Documentation: https://cloudinary.com/documentation

Good luck with your migration! 🚀