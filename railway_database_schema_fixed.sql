-- ================================================================================
-- RAILWAY POSTGRESQL SCHEMA FOR ZENTRO HOMES - CORRECTED VERSION
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
-- HELPER FUNCTIONS
-- ================================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate clean slug from text
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(
        regexp_replace(
            regexp_replace(
                trim(input_text), 
                '[^a-zA-Z0-9\s-]', '', 'g'
            ), 
            '\s+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique property slug
CREATE OR REPLACE FUNCTION generate_property_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Only generate slug if it's empty or null
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        base_slug := generate_slug(NEW.title);
        final_slug := base_slug;
        
        -- Check for uniqueness and append counter if needed
        WHILE EXISTS (SELECT 1 FROM properties WHERE slug = final_slug AND id != COALESCE(NEW.id, 0)) LOOP
            counter := counter + 1;
            final_slug := base_slug || '-' || counter;
        END LOOP;
        
        NEW.slug := final_slug;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

-- ================================================================================
-- TRIGGERS
-- ================================================================================

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

-- Trigger for automatic slug generation
CREATE TRIGGER generate_property_slug_trigger
    BEFORE INSERT OR UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION generate_property_slug();

-- Trigger for search vector updates
CREATE TRIGGER update_property_search_vector_trigger
    BEFORE INSERT OR UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_property_search_vector();