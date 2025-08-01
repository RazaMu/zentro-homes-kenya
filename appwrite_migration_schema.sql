-- ================================================================================
-- APPWRITE DATABASE MIGRATION SCHEMA FOR ZENTRO HOMES
-- Database Name: zentro_homes_db
-- Consolidated single-database design for Appwrite.io free plan
-- ================================================================================

-- DATABASE CONFIGURATION:
-- Database ID: zentro_homes_db
-- Database Name: Zentro Homes Database
-- Description: Real estate property management system for Zentro Homes Kenya

-- Create the main properties table with embedded media and contact data
CREATE TABLE IF NOT EXISTS properties (
    -- Primary key and basic info
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Property basic information
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Villa', 'Apartment', 'Penthouse', 'Condo')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('For Sale', 'For Rent')),
    price BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    
    -- Location information
    location_area VARCHAR(100) NOT NULL,
    location_city VARCHAR(100) NOT NULL,
    location_country VARCHAR(100) DEFAULT 'Kenya',
    location_coordinates_lat DECIMAL(10, 8),
    location_coordinates_lng DECIMAL(11, 8),
    
    -- Property features
    bedrooms INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    parking INTEGER DEFAULT 0,
    size INTEGER NOT NULL,
    size_unit VARCHAR(10) DEFAULT 'm²',
    year_built INTEGER,
    furnished BOOLEAN DEFAULT true,
    
    -- Content and description
    description TEXT NOT NULL,
    
    -- Media storage as JSON fields (optimized for Appwrite)
    -- Images stored as JSON array with metadata
    images_data TEXT, -- JSON: [{"url": "storage_url", "alt": "text", "is_primary": true, "display_order": 0, "file_size": 123456, "mime_type": "image/jpeg"}]
    
    -- Videos stored as JSON array with metadata  
    videos_data TEXT, -- JSON: [{"url": "storage_url", "title": "Video title", "description": "desc", "thumbnail": "thumb_url", "duration": 120, "display_order": 0}]
    
    -- YouTube video URL (single field for embedded videos)
    youtube_url TEXT,
    
    -- Amenities as JSON array
    amenities TEXT, -- JSON: ["Swimming Pool", "Garden", "Security", "Parking"]
    
    -- Property status and availability
    available BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    
    -- Media summary fields for quick queries
    total_images INTEGER DEFAULT 0,
    total_videos INTEGER DEFAULT 0,
    primary_image_url TEXT,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ================================================================================

-- Index for status filtering (most common query)
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- Index for location searches
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location_city, location_area);

-- Index for price range queries
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);

-- Index for property type filtering
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);

-- Index for availability status
CREATE INDEX IF NOT EXISTS idx_properties_available ON properties(available);

-- Index for featured properties
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);

-- Index for bedrooms filtering
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties(bedrooms);

-- Index for creation date (for newest/oldest sorting)
CREATE INDEX IF NOT EXISTS idx_properties_created ON properties(created_at);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_properties_status_type ON properties(status, type);
CREATE INDEX IF NOT EXISTS idx_properties_location_status ON properties(location_city, status);

-- ================================================================================
-- CONTACT INQUIRIES TABLE (consolidated into main database)
-- ================================================================================

CREATE TABLE IF NOT EXISTS contact_inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Contact information
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Inquiry details
    property_id INTEGER, -- NULL for general inquiries
    inquiry_type VARCHAR(50) DEFAULT 'general', -- 'property', 'general', 'viewing', 'info'
    subject VARCHAR(255),
    message TEXT NOT NULL,
    
    -- Inquiry metadata
    preferred_contact_method VARCHAR(20) DEFAULT 'email', -- 'email', 'phone', 'whatsapp'
    preferred_contact_time VARCHAR(50), -- 'morning', 'afternoon', 'evening', 'anytime'
    
    -- Admin fields
    status VARCHAR(20) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'closed'
    priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    assigned_to VARCHAR(100), -- Admin user who is handling this inquiry
    admin_notes TEXT,
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'website', -- 'website', 'social', 'referral', 'advertisement'
    user_agent TEXT, -- Browser/device info
    ip_address VARCHAR(45), -- For analytics and spam prevention
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    contacted_at DATETIME, -- When admin first contacted the client
    
    -- Foreign key constraint (if property_id is provided)
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

-- Indexes for contact inquiries
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contacts_property ON contact_inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contact_inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contact_inquiries(priority);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contact_inquiries(email);

-- ================================================================================
-- ADMIN SESSIONS TABLE (for authentication tracking)
-- ================================================================================

CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Session information
    session_token VARCHAR(255) UNIQUE NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    admin_name VARCHAR(100),
    
    -- Session metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_method VARCHAR(20) DEFAULT 'password', -- 'password', 'google', 'facebook'
    
    -- Session status
    is_active BOOLEAN DEFAULT true,
    expires_at DATETIME NOT NULL,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Security fields
    login_attempts INTEGER DEFAULT 0,
    security_level VARCHAR(20) DEFAULT 'normal', -- 'normal', 'elevated', 'admin'
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for admin sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_email ON admin_sessions(admin_email);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON admin_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);

-- ================================================================================
-- WEBSITE ANALYTICS TABLE (optional - for tracking visitor behavior)
-- ================================================================================

CREATE TABLE IF NOT EXISTS website_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Page/event information
    event_type VARCHAR(50) NOT NULL, -- 'page_view', 'property_view', 'contact_form', 'search', 'filter'
    page_url TEXT,
    property_id INTEGER, -- If event is related to a specific property
    
    -- User information (anonymous)
    session_id VARCHAR(100), -- Anonymous session tracking
    user_agent TEXT,
    ip_address VARCHAR(45),
    referrer TEXT,
    
    -- Event metadata
    event_data TEXT, -- JSON data for additional event information
    duration INTEGER, -- Time spent on page (seconds)
    
    -- Geographic data (if available)
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Device information
    device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(50),
    os VARCHAR(50),
    
    -- Timestamp
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON website_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_property ON website_analytics(property_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON website_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON website_analytics(session_id);

-- ================================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ================================================================================

-- Trigger for properties table
CREATE TRIGGER IF NOT EXISTS update_properties_timestamp 
    AFTER UPDATE ON properties
    FOR EACH ROW
BEGIN
    UPDATE properties SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for contact inquiries
CREATE TRIGGER IF NOT EXISTS update_contacts_timestamp 
    AFTER UPDATE ON contact_inquiries
    FOR EACH ROW
BEGIN
    UPDATE contact_inquiries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for admin sessions
CREATE TRIGGER IF NOT EXISTS update_sessions_timestamp 
    AFTER UPDATE ON admin_sessions
    FOR EACH ROW
BEGIN
    UPDATE admin_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ================================================================================
-- SAMPLE DATA FOR TESTING
-- ================================================================================

-- Insert sample properties with embedded media data
INSERT OR IGNORE INTO properties (
    title, type, status, price, location_area, location_city, 
    bedrooms, bathrooms, parking, size, description, 
    images_data, videos_data, amenities, youtube_url, 
    year_built, featured, total_images, total_videos
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
    'A stunning villa with panoramic city views, private pool, and luxury amenities. This exceptional property offers the perfect blend of modern luxury and comfort.',
    '[{"url": "property-images/villa1_main.jpg", "alt": "Villa exterior view", "is_primary": true, "display_order": 0, "file_size": 2500000, "mime_type": "image/jpeg"}, {"url": "property-images/villa1_pool.jpg", "alt": "Swimming pool area", "is_primary": false, "display_order": 1, "file_size": 1800000, "mime_type": "image/jpeg"}]',
    '[{"url": "property-videos/villa1_tour.mp4", "title": "Virtual Tour", "description": "Complete virtual tour of the villa", "thumbnail": "property-thumbnails/villa1_thumb.jpg", "duration": 180, "display_order": 0}]',
    '["Swimming Pool", "Garden", "Security", "Parking", "Modern Kitchen", "Balcony", "Roof Terrace", "City View"]',
    'https://youtube.com/watch?v=example1',
    2022,
    true,
    2,
    1
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
    '[{"url": "property-images/apt1_main.jpg", "alt": "Apartment living room", "is_primary": true, "display_order": 0, "file_size": 1900000, "mime_type": "image/jpeg"}, {"url": "property-images/apt1_kitchen.jpg", "alt": "Modern kitchen", "is_primary": false, "display_order": 1, "file_size": 1500000, "mime_type": "image/jpeg"}, {"url": "property-images/apt1_bedroom.jpg", "alt": "Master bedroom", "is_primary": false, "display_order": 2, "file_size": 1700000, "mime_type": "image/jpeg"}]',
    '[]',
    '["Gym", "Swimming Pool", "Security", "Parking", "Elevator", "Air Conditioning"]',
    null,
    2023,
    false,
    3,
    0
),
(
    'Executive Penthouse in Lavington',
    'Penthouse',
    'For Sale',
    125000000,
    'Lavington',
    'Nairobi',
    4,
    3,
    3,
    280,
    'Exclusive penthouse offering breathtaking views and top-tier amenities. Perfect for executives seeking luxury living in a prime location.',
    '[{"url": "property-images/pent1_main.jpg", "alt": "Penthouse exterior", "is_primary": true, "display_order": 0, "file_size": 2200000, "mime_type": "image/jpeg"}]',
    '[]',
    '["City View", "Roof Terrace", "Modern Kitchen", "Security", "Parking", "Elevator", "Smart Home"]',
    null,
    2024,
    true,
    1,
    0
);

-- Insert sample contact inquiries
INSERT OR IGNORE INTO contact_inquiries (
    name, email, phone, property_id, inquiry_type, subject, message, 
    preferred_contact_method, status, source
) VALUES 
(
    'John Doe',
    'john.doe@email.com',
    '+254701234567',
    1,
    'property',
    'Interest in Kilimani Villa',
    'Hi, I am interested in viewing the luxury villa in Kilimani. Please contact me to schedule a viewing.',
    'phone',
    'new',
    'website'
),
(
    'Jane Smith',
    'jane.smith@email.com',
    '+254702345678',
    2,
    'property',
    'Rental Inquiry - Westlands Apartment',
    'I would like to inquire about the rental terms for the apartment in Westlands.',
    'email',
    'new',
    'website'
),
(
    'Mike Johnson',
    'mike.j@email.com',
    '+254703456789',
    null,
    'general',
    'General Inquiry',
    'Do you have any properties available in Karen area?',
    'email',
    'new',
    'website'
);

-- ================================================================================
-- VIEWS FOR COMMON QUERIES (optional optimization)
-- ================================================================================

-- View for active properties with basic info
CREATE VIEW IF NOT EXISTS active_properties AS
SELECT 
    id, title, type, status, price, currency,
    location_area, location_city, location_country,
    bedrooms, bathrooms, parking, size, size_unit,
    primary_image_url, total_images, total_videos,
    featured, created_at
FROM properties 
WHERE available = true
ORDER BY featured DESC, created_at DESC;

-- View for property search (includes searchable text)
CREATE VIEW IF NOT EXISTS searchable_properties AS
SELECT 
    id, title, type, status, price, currency,
    location_area, location_city, bedrooms, bathrooms,
    primary_image_url, featured,
    (title || ' ' || location_area || ' ' || location_city || ' ' || type) AS searchable_text
FROM properties 
WHERE available = true;

-- View for admin dashboard statistics
CREATE VIEW IF NOT EXISTS admin_stats AS
SELECT 
    COUNT(*) as total_properties,
    COUNT(CASE WHEN status = 'For Sale' THEN 1 END) as for_sale_count,
    COUNT(CASE WHEN status = 'For Rent' THEN 1 END) as for_rent_count,
    COUNT(CASE WHEN featured = true THEN 1 END) as featured_count,
    AVG(price) as average_price,
    SUM(total_images) as total_images_count,
    SUM(total_videos) as total_videos_count,
    COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as new_this_month
FROM properties 
WHERE available = true;

-- ================================================================================
-- APPWRITE SETUP INSTRUCTIONS
-- ================================================================================

/*
STEP 1: CREATE DATABASE
- Go to Appwrite Console > Databases
- Click "Create Database"
- Database ID: zentro_homes_db
- Database Name: Zentro Homes Database

STEP 2: APPWRITE COLLECTION SETTINGS:

1. Collection Name: "properties"
   - Document Security: Enabled
   - Permissions: 
     * Read: ["role:all"] (public read for website)
     * Create/Update/Delete: ["role:member"] (admin only)

2. Collection Name: "contact_inquiries" 
   - Document Security: Enabled
   - Permissions:
     * Read/Update: ["role:member"] (admin only)
     * Create: ["role:all"] (public can submit)

3. Collection Name: "admin_sessions"
   - Document Security: Enabled
   - Permissions:
     * All: ["role:member"] (admin only)

4. Collection Name: "website_analytics"
   - Document Security: Enabled  
   - Permissions:
     * Create: ["role:all"] (public can track)
     * Read: ["role:member"] (admin only)

APPWRITE STORAGE BUCKET:
- Bucket Name: "property-media"
- Permissions:
  * Read: ["role:all"] (public access for website)
  * Create/Delete: ["role:member"] (admin only)
- File Size Limit: 50MB
- Allowed Extensions: jpg, jpeg, png, webp, gif, mp4, webm, mov
- Compression: Enabled
- Encryption: Enabled

MIGRATION STRATEGY:
1. Create database collections using Appwrite Console
2. Set up storage bucket for media files
3. Update JavaScript code to use Appwrite SDK instead of Supabase
4. Migrate existing data using batch operations
5. Update image URLs to point to Appwrite storage
*/

-- ================================================================================
-- END OF SCHEMA
-- ================================================================================