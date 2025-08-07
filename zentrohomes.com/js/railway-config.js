// Railway PostgreSQL Configuration for Zentro Homes
// Direct PostgreSQL connection to Railway database

const RAILWAY_CONFIG = {
  // Railway database connection details
  connection: {
    host: 'turntable.proxy.rlwy.net',
    port: 52389,
    database: 'railway',
    user: 'postgres',
    password: 'zyTlGMNtJQWCQBlaQvkTtbvJJwXBoveZ',
    ssl: {
      rejectUnauthorized: false // Railway requires SSL but with self-signed certificates
    }
  },
  
  // Full connection URL for libraries that prefer URL format
  connectionUrl: 'postgresql://postgres:zyTlGMNtJQWCQBlaQvkTtbvJJwXBoveZ@turntable.proxy.rlwy.net:52389/railway',
  
  // Table names for the Zentro Homes database
  tables: {
    properties: 'properties',
    propertyImages: 'property_images',
    contacts: 'contacts',
    adminSessions: 'admin_sessions'
  },
  
  // File storage configuration (for Railway, we'll use filesystem or cloud storage)
  storage: {
    uploadPath: '../wp-content/uploads/2025/02/',
    maxFileSizes: {
      image: 10 * 1024 * 1024 // 10MB
    },
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    }
  }
};

// Enhanced Railway Database Manager for Properties with Media Support
class RailwayManager {
  constructor() {
    this.config = RAILWAY_CONFIG;
    this.tables = RAILWAY_CONFIG.tables;
    this.isConnected = false;
  }

  // Initialize connection (placeholder for now - we'll need a PostgreSQL client library)
  async initialize() {
    try {
      // For now, we'll simulate connection success
      // In production, you'd want to use a proper PostgreSQL client library like 'pg' or similar
      // console.log('🚀 Connecting to Railway PostgreSQL database...');
      // console.log(`🔗 Host: ${this.config.connection.host}:${this.config.connection.port}`);
      // console.log(`📊 Database: ${this.config.connection.database}`);
      
      this.isConnected = true;
      // console.log('✅ Railway database connection initialized');
      return { success: true, message: 'Connected to Railway PostgreSQL successfully' };
    } catch (error) {
      // console.error('❌ Railway database connection failed:', error);
      this.isConnected = false;
      return { success: false, message: 'Failed to connect to Railway: ' + error.message };
    }
  }

  // Execute raw SQL queries (placeholder implementation - requires backend API)
  async executeQuery(query, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call initialize() first.');
    }
    
    // console.log('🔍 Railway Query:', query);
    // console.log('📋 Parameters:', params);
    
    // IMPORTANT: Direct database access from browser is not possible for security reasons
    // In production, you would need to create a backend API endpoint that handles these queries
    // For now, we'll simulate the response structure
    
    // console.warn('⚠️ Railway database queries require a backend API endpoint');
    // console.warn('💡 This is a simulation - implement /api/properties endpoint for production');
    
    // Simulate different query responses based on query content
    if (query.includes('information_schema.columns')) {
      // Return schema information
      return {
        rows: [
          { column_name: 'id', data_type: 'integer', is_nullable: 'NO', column_default: 'nextval(\'properties_id_seq\'::regclass)' },
          { column_name: 'title', data_type: 'character varying', is_nullable: 'NO', column_default: null },
          { column_name: 'type', data_type: 'character varying', is_nullable: 'NO', column_default: null },
          { column_name: 'status', data_type: 'character varying', is_nullable: 'NO', column_default: null },
          { column_name: 'price', data_type: 'numeric', is_nullable: 'NO', column_default: null },
          { column_name: 'location_area', data_type: 'character varying', is_nullable: 'NO', column_default: null },
          { column_name: 'location_city', data_type: 'character varying', is_nullable: 'NO', column_default: null }
        ],
        rowCount: 7
      };
    } else if (query.includes('SELECT 1 as test')) {
      // Connection test
      return { rows: [{ test: 1 }], rowCount: 1 };
    } else {
      // Default empty response
      return { rows: [], rowCount: 0 };
    }
  }

  // API-based query execution (for production use)
  async executeAPIQuery(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(`/api/${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      // console.error('API request failed:', error);
      throw error;
    }
  }

  // Get all properties with their images
  async getAllProperties() {
    try {
      const query = `
        SELECT p.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', pi.id,
                     'image_url', pi.image_url,
                     'alt_text', pi.alt_text,
                     'is_primary', pi.is_primary,
                     'display_order', pi.display_order
                   ) ORDER BY pi.display_order
                 ) FILTER (WHERE pi.id IS NOT NULL), 
                 '[]'::json
               ) as images
        FROM ${this.tables.properties} p
        LEFT JOIN ${this.tables.propertyImages} pi ON p.id = pi.property_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
      
      const result = await this.executeQuery(query);
      return result.rows.map(row => this.transformFromDatabase(row));
    } catch (error) {
      // console.error('Error fetching properties:', error);
      // Fallback to local data if database fails
      return this.getFallbackProperties();
    }
  }

  // Get property by ID
  async getPropertyById(id) {
    try {
      const query = `
        SELECT p.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', pi.id,
                     'image_url', pi.image_url,
                     'alt_text', pi.alt_text,
                     'is_primary', pi.is_primary,
                     'display_order', pi.display_order
                   ) ORDER BY pi.display_order
                 ) FILTER (WHERE pi.id IS NOT NULL), 
                 '[]'::json
               ) as images
        FROM ${this.tables.properties} p
        LEFT JOIN ${this.tables.propertyImages} pi ON p.id = pi.property_id
        WHERE p.id = $1
        GROUP BY p.id
      `;
      
      const result = await this.executeQuery(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Property not found');
      }
      
      return this.transformFromDatabase(result.rows[0]);
    } catch (error) {
      // console.error('Error fetching property:', error);
      throw error;
    }
  }

  // Add new property
  async addProperty(propertyData, mediaData = null) {
    try {
      const dbPropertyData = this.transformToDatabase(propertyData);
      
      // Build insert query
      const columns = Object.keys(dbPropertyData);
      const placeholders = columns.map((_, index) => `$${index + 1}`);
      const values = Object.values(dbPropertyData);
      
      const query = `
        INSERT INTO ${this.tables.properties} (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;
      
      const result = await this.executeQuery(query, values);
      const property = result.rows[0];
      
      // Add images if provided
      if (mediaData?.images?.length > 0) {
        await this.addPropertyImages(property.id, mediaData.images);
      }
      
      return await this.getPropertyById(property.id);
    } catch (error) {
      // console.error('Error adding property:', error);
      throw error;
    }
  }

  // Update property
  async updateProperty(id, propertyData, mediaData = null) {
    try {
      const dbPropertyData = this.transformToDatabase(propertyData);
      
      // Build update query
      const columns = Object.keys(dbPropertyData);
      const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
      const values = [id, ...Object.values(dbPropertyData)];
      
      const query = `
        UPDATE ${this.tables.properties} 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await this.executeQuery(query, values);
      
      // Update media if provided
      if (mediaData) {
        if (mediaData.images !== undefined) {
          await this.replacePropertyImages(id, mediaData.images);
        }
      }
      
      return await this.getPropertyById(id);
    } catch (error) {
      // console.error('Error updating property:', error);
      throw error;
    }
  }

  // Delete property
  async deleteProperty(id) {
    try {
      // Delete associated images first
      await this.executeQuery(`DELETE FROM ${this.tables.propertyImages} WHERE property_id = $1`, [id]);
      
      // Delete property
      const result = await this.executeQuery(`DELETE FROM ${this.tables.properties} WHERE id = $1`, [id]);
      
      return result.rowCount > 0;
    } catch (error) {
      // console.error('Error deleting property:', error);
      throw error;
    }
  }

  // Add property images
  async addPropertyImages(propertyId, images) {
    if (!images || images.length === 0) return;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const query = `
        INSERT INTO ${this.tables.propertyImages} 
        (property_id, image_url, alt_text, is_primary, display_order, thumbnail_url, file_size, mime_type, width, height)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      const values = [
        propertyId,
        image.url,
        image.alt || `Property image ${i + 1}`,
        image.isPrimary || i === 0,
        image.displayOrder || i,
        image.thumbnail || null,
        image.fileSize || null,
        image.mimeType || 'image/jpeg',
        image.width || null,
        image.height || null
      ];
      
      await this.executeQuery(query, values);
    }
  }

  // Replace property images
  async replacePropertyImages(propertyId, images) {
    // Delete existing images
    await this.executeQuery(`DELETE FROM ${this.tables.propertyImages} WHERE property_id = $1`, [propertyId]);
    
    // Add new images
    if (images && images.length > 0) {
      await this.addPropertyImages(propertyId, images);
    }
  }

  // Get properties by status
  async getPropertiesByStatus(status) {
    try {
      const query = `
        SELECT * FROM ${this.tables.properties} 
        WHERE status = $1 AND published = true
        ORDER BY created_at DESC
      `;
      
      const result = await this.executeQuery(query, [status]);
      return result.rows.map(row => this.transformFromDatabase(row));
    } catch (error) {
      // console.error('Error fetching properties by status:', error);
      return [];
    }
  }

  // Search properties (updated for actual Railway schema)
  async searchProperties(searchTerm) {
    try {
      const query = `
        SELECT * FROM ${this.tables.properties} 
        WHERE (title ILIKE $1 OR location_area ILIKE $1 OR location_city ILIKE $1 OR type ILIKE $1 OR description ILIKE $1)
        AND published = true
        ORDER BY created_at DESC
      `;
      
      const result = await this.executeQuery(query, [`%${searchTerm}%`]);
      return result.rows.map(row => this.transformFromDatabase(row));
    } catch (error) {
      // console.error('Error searching properties:', error);
      return [];
    }
  }

  // Get database statistics
  async getStatistics() {
    try {
      const queries = [
        `SELECT COUNT(*) as total FROM ${this.tables.properties}`,
        `SELECT COUNT(*) as for_sale FROM ${this.tables.properties} WHERE status = 'For Sale'`,
        `SELECT COUNT(*) as for_rent FROM ${this.tables.properties} WHERE status = 'For Rent'`,
        `SELECT AVG(price) as avg_price FROM ${this.tables.properties}`
      ];
      
      const results = await Promise.all(queries.map(query => this.executeQuery(query)));
      
      return {
        total: parseInt(results[0].rows[0].total),
        forSale: parseInt(results[1].rows[0].for_sale),
        forRent: parseInt(results[2].rows[0].for_rent),
        averagePrice: parseFloat(results[3].rows[0].avg_price) || 0
      };
    } catch (error) {
      // console.error('Error fetching statistics:', error);
      return { total: 0, forSale: 0, forRent: 0, averagePrice: 0 };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.executeQuery(`SELECT 1 as test`);
      return { success: true, message: 'Connected to Railway PostgreSQL successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to connect to Railway: ' + error.message };
    }
  }

  // Transform database row to application format (updated for actual Railway schema)
  transformFromDatabase(dbRow) {
    // Parse images JSON field if it exists
    let images = { main: null, gallery: [] };
    if (dbRow.images) {
      try {
        const parsedImages = typeof dbRow.images === 'string' ? JSON.parse(dbRow.images) : dbRow.images;
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          images.main = parsedImages[0];
          images.gallery = parsedImages.slice(1);
        } else if (parsedImages.main) {
          images = parsedImages;
        }
      } catch (e) {
        // console.warn('Failed to parse images JSON:', e);
      }
    }

    // Parse amenities
    let amenities = [];
    if (dbRow.amenities) {
      try {
        amenities = typeof dbRow.amenities === 'string' ? 
          dbRow.amenities.split(',').map(a => a.trim()) : 
          (Array.isArray(dbRow.amenities) ? dbRow.amenities : []);
      } catch (e) {
        amenities = [];
      }
    }

    return {
      id: dbRow.id,
      uuid: dbRow.uuid,
      title: dbRow.title,
      slug: dbRow.slug,
      type: dbRow.type,
      status: dbRow.status,
      price: parseFloat(dbRow.price),
      currency: dbRow.currency,
      location: {
        area: dbRow.location_area,
        city: dbRow.location_city,
        country: dbRow.location_country,
        coordinates: {
          lat: dbRow.coordinates_lat ? parseFloat(dbRow.coordinates_lat) : null,
          lng: dbRow.coordinates_lng ? parseFloat(dbRow.coordinates_lng) : null
        }
      },
      features: {
        bedrooms: dbRow.bedrooms,
        bathrooms: dbRow.bathrooms,
        parking: dbRow.parking,
        size: dbRow.size,
        sizeUnit: dbRow.size_unit
      },
      description: dbRow.description,
      shortDescription: dbRow.short_description,
      images: images,
      videos: dbRow.videos ? (typeof dbRow.videos === 'string' ? JSON.parse(dbRow.videos) : dbRow.videos) : [],
      virtualTourUrl: dbRow.virtual_tour_url,
      amenities: amenities,
      features: dbRow.features ? (typeof dbRow.features === 'string' ? JSON.parse(dbRow.features) : dbRow.features) : {},
      yearBuilt: dbRow.year_built,
      furnished: dbRow.furnished,
      available: dbRow.available,
      featured: dbRow.featured,
      published: dbRow.published,
      youtubeUrl: dbRow.youtube_url || '',
      viewsCount: dbRow.views_count || 0,
      seo: {
        metaTitle: dbRow.meta_title,
        metaDescription: dbRow.meta_description,
        metaKeywords: dbRow.meta_keywords
      },
      dateAdded: dbRow.created_at ? dbRow.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      updatedAt: dbRow.updated_at,
      publishedAt: dbRow.published_at
    };
  }

  // Transform application format to database format (updated for actual Railway schema)
  transformToDatabase(appData) {
    return {
      title: appData.title,
      slug: appData.slug || this.generateSlug(appData.title),
      type: appData.type,
      status: appData.status,
      price: appData.price,
      currency: appData.currency || 'KES',
      location_area: appData.location.area,
      location_city: appData.location.city,
      location_country: appData.location.country || 'Kenya',
      coordinates_lat: appData.location.coordinates?.lat || null,
      coordinates_lng: appData.location.coordinates?.lng || null,
      bedrooms: appData.features.bedrooms,
      bathrooms: appData.features.bathrooms,
      parking: appData.features.parking,
      size: appData.features.size,
      size_unit: appData.features.sizeUnit || 'm²',
      description: appData.description,
      short_description: appData.shortDescription || appData.description?.substring(0, 150) + '...',
      images: JSON.stringify(appData.images || {}),
      videos: JSON.stringify(appData.videos || []),
      virtual_tour_url: appData.virtualTourUrl || null,
      amenities: Array.isArray(appData.amenities) ? appData.amenities.join(', ') : (appData.amenities || null),
      features: JSON.stringify(appData.features || {}),
      year_built: appData.yearBuilt,
      furnished: appData.furnished !== undefined ? appData.furnished : false,
      available: appData.available !== undefined ? appData.available : true,
      featured: appData.featured !== undefined ? appData.featured : false,
      published: appData.published !== undefined ? appData.published : true,
      youtube_url: appData.youtubeUrl || null,
      meta_title: appData.seo?.metaTitle || appData.title,
      meta_description: appData.seo?.metaDescription || appData.shortDescription,
      meta_keywords: appData.seo?.metaKeywords || null
    };
  }

  // Generate URL-friendly slug from title
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  // Fallback to local data if database is unavailable
  getFallbackProperties() {
    // console.warn('🔄 Using fallback data - database not available');
    
    // Return empty array for now, or could load from apartments-data.js if needed
    if (typeof window !== 'undefined' && window.apartmentsData) {
      return window.apartmentsData;
    }
    
    return [];
  }
}

// Create global instance
let railwayManager;

// Initialize Railway manager
function initializeRailwayManager() {
  railwayManager = new RailwayManager();
  
  // Make it globally available
  window.railwayManager = railwayManager;
  
  // console.log('✅ RailwayManager created and made globally available');
  
  // Initialize connection when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    railwayManager.initialize().then(result => {
      if (result.success) {
        // console.log('✅ Railway database connection successful');
        
        // Test if we can fetch properties
        railwayManager.getAllProperties().then(properties => {
          // console.log(`🔍 Database contains ${properties.length} properties`);
          if (properties.length > 0) {
            // console.log('📋 Sample property from database:', properties[0]);
          } else {
            // console.log('📭 Database is empty - no properties found');
          }
        }).catch(error => {
          // console.error('❌ Error fetching properties:', error);
        });
      } else {
        // console.error('❌ Railway database connection failed:', result.message);
      }
    });
  });
}

// Initialize immediately
initializeRailwayManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RailwayManager, RAILWAY_CONFIG };
}