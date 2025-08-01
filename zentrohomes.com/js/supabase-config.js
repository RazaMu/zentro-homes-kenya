// Supabase Configuration for Zentro Homes
// Replace these with your actual Supabase project credentials

const SUPABASE_CONFIG = {
  // Supabase project URL from .env
  url: 'https://yqskldskeokvgigyrfnw.supabase.co',
  
  // Supabase anon key for public operations
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxc2tsZHNrZW9rdmdpZ3lyZm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2ODQ0MDMsImV4cCI6MjA2OTI2MDQwM30.5Mly7KA5h8862yEaz0FeiIWfbThcOiEI9QPCk-SX_wo',
  
  // Service role key for admin operations (storage uploads, etc.)
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxc2tsZHNrZW9rdmdpZ3lyZm53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY4NDQwMywiZXhwIjoyMDY5MjYwNDAzfQ.51ZXyxnjeXUhrrufQrnZOh5-uo67N8Za6Qsz3Bm1TF4',
  
  // Table names based on your actual database schema
  tables: {
    properties: 'properties',
    propertyImages: 'property_images',
    contacts: 'contacts',
    adminSessions: 'admin_sessions'
  },
  
  storage: {
    buckets: {
      images: 'property-images',
      thumbnails: 'property-thumbnails'
    },
    maxFileSizes: {
      image: 10 * 1024 * 1024 // 10MB
    },
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    }
  }
};

// Initialize Supabase client
// Note: Make sure to include the Supabase CDN script before this file
let supabase;

// Wait for Supabase CDN to load
function initializeSupabase() {
  if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    console.log('✅ Supabase client initialized');
    return true;
  }
  return false;
}

// Enhanced Supabase Database Manager for Properties with Media Support
class SupabaseManager {
  constructor() {
    this.client = supabase;
    this.tables = SUPABASE_CONFIG.tables;
  }

  // Get all properties with their images
  async getAllProperties() {
    try {
      // Get properties
      const { data: properties, error: propertiesError } = await this.client
        .from(this.tables.properties)
        .select('*')
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      // Get images for all properties
      const { data: images, error: imagesError } = await this.client
        .from(this.tables.propertyImages)
        .select('*')
        .order('display_order', { ascending: true });

      if (imagesError) throw imagesError;

      // Combine properties with their media (no videos table needed)
      return properties.map(property => this.combinePropertyWithMedia(property, images, []));
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  }

  // Get property by ID
  async getPropertyById(id) {
    try {
      const { data, error } = await this.client
        .from(this.tables.properties)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  }

  // Add new property with media
  async addProperty(propertyData, mediaData = null) {
    try {
      // First, insert the property
      const dbPropertyData = this.transformPropertyToDatabase(propertyData);
      
      const { data: property, error: propertyError } = await this.client
        .from(this.tables.properties)
        .insert(dbPropertyData)
        .select()
        .single();

      if (propertyError) throw propertyError;

      const propertyId = property.id;

      // Add images if provided
      if (mediaData?.images?.length > 0) {
        await this.addPropertyImages(propertyId, mediaData.images);
      }

      // YouTube URL is already stored in the property record, no separate table needed

      // Return the complete property with media
      return await this.getPropertyById(propertyId);
    } catch (error) {
      console.error('Error adding property:', error);
      throw error;
    }
  }

  // Update property with media
  async updateProperty(id, propertyData, mediaData = null) {
    try {
      // Update property data
      const dbPropertyData = this.transformPropertyToDatabase(propertyData);
      
      const { data: property, error: propertyError } = await this.client
        .from(this.tables.properties)
        .update(dbPropertyData)
        .eq('id', id)
        .select()
        .single();

      if (propertyError) throw propertyError;

      // Update media if provided
      if (mediaData) {
        // Replace images if provided
        if (mediaData.images !== undefined) {
          await this.replacePropertyImages(id, mediaData.images);
        }

        // YouTube URL is already updated in the property record, no separate table needed
      }

      // Return the complete updated property
      return await this.getPropertyById(id);
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  }

  // Delete property
  async deleteProperty(id) {
    try {
      const { error } = await this.client
        .from(this.tables.properties)
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  }

  // Filter properties by status
  async getPropertiesByStatus(status) {
    try {
      const { data, error } = await this.client
        .from(this.tables.properties)
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(property => this.transformFromDatabase(property));
    } catch (error) {
      console.error('Error fetching properties by status:', error);
      throw error;
    }
  }

  // Search properties
  async searchProperties(searchTerm) {
    try {
      const { data, error } = await this.client
        .from(this.tables.properties)
        .select('*')
        .or(`title.ilike.%${searchTerm}%,location_area.ilike.%${searchTerm}%,location_city.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(property => this.transformFromDatabase(property));
    } catch (error) {
      console.error('Error searching properties:', error);
      throw error;
    }
  }

  // Transform database row to application format
  transformFromDatabase(dbRow) {
    return {
      id: dbRow.id,
      title: dbRow.title,
      type: dbRow.type,
      status: dbRow.status,
      price: dbRow.price,
      currency: dbRow.currency,
      location: {
        area: dbRow.location_area,
        city: dbRow.location_city,
        country: dbRow.location_country,
        coordinates: {
          lat: dbRow.location_lat,
          lng: dbRow.location_lng
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
      images: {
        main: dbRow.main_image,
        gallery: dbRow.gallery_images || []
      },
      amenities: dbRow.amenities || [],
      yearBuilt: dbRow.year_built,
      furnished: dbRow.furnished,
      available: dbRow.available,
      youtubeUrl: dbRow.youtube_url || '',
      dateAdded: dbRow.created_at ? dbRow.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
    };
  }

  // Transform application format to database format
  transformToDatabase(appData) {
    return {
      title: appData.title,
      type: appData.type,
      status: appData.status,
      price: appData.price,
      currency: appData.currency || 'KES',
      location_area: appData.location.area,
      location_city: appData.location.city,
      location_country: appData.location.country || 'Kenya',
      location_lat: appData.location.coordinates?.lat || null,
      location_lng: appData.location.coordinates?.lng || null,
      bedrooms: appData.features.bedrooms,
      bathrooms: appData.features.bathrooms,
      parking: appData.features.parking,
      size: appData.features.size,
      size_unit: appData.features.sizeUnit || 'm²',
      description: appData.description,
      main_image: appData.images.main,
      gallery_images: appData.images.gallery || [],
      amenities: appData.amenities || [],
      year_built: appData.yearBuilt,
      furnished: appData.furnished !== undefined ? appData.furnished : true,
      available: appData.available !== undefined ? appData.available : true
    };
  }

  // Get database statistics
  async getStatistics() {
    try {
      const { data, count, error } = await this.client
        .from(this.tables.properties)
        .select('*', { count: 'exact' });

      if (error) throw error;

      const forSaleCount = data.filter(p => p.status === 'For Sale').length;
      const forRentCount = data.filter(p => p.status === 'For Rent').length;
      const avgPrice = data.length > 0 ? data.reduce((sum, p) => sum + p.price, 0) / data.length : 0;

      return {
        total: count,
        forSale: forSaleCount,
        forRent: forRentCount,
        averagePrice: avgPrice
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  // Test connection
  async testConnection() {
    try {
      const { data, error } = await this.client
        .from(this.tables.properties)
        .select('count', { count: 'exact' })
        .limit(1);

      if (error) throw error;
      
      return { success: true, message: 'Connected to Supabase successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to connect to Supabase: ' + error.message };
    }
  }

  // Add property images
  async addPropertyImages(propertyId, images) {
    if (!images || images.length === 0) return;

    const imageRecords = images.map((image, index) => ({
      property_id: propertyId,
      image_url: image.url,
      alt_text: image.alt || `Property image ${index + 1}`,
      is_primary: image.isPrimary || index === 0,
      display_order: image.displayOrder || index,
      thumbnail_url: image.thumbnail,
      file_size: image.fileSize || null,
      mime_type: image.mimeType || 'image/jpeg',
      width: image.width || null,
      height: image.height || null
    }));

    const { error } = await this.client
      .from(this.tables.propertyImages)
      .insert(imageRecords);

    if (error) throw error;
  }

  // Replace property images
  async replacePropertyImages(propertyId, images) {
    // Delete existing images
    await this.client
      .from(this.tables.propertyImages)
      .delete()
      .eq('property_id', propertyId);

    // Add new images
    if (images && images.length > 0) {
      await this.addPropertyImages(propertyId, images);
    }
  }

  // Combine property with its media
  combinePropertyWithMedia(property, allImages, allVideos = []) {
    const propertyImages = allImages.filter(img => img.property_id === property.id);

    // Find primary image or use first image
    const primaryImage = propertyImages.find(img => img.is_primary) || propertyImages[0];
    const galleryImages = propertyImages.filter(img => !img.is_primary);

    // Helper function to ensure proper Supabase Storage URL
    const getImageUrl = (imageRecord) => {
      if (!imageRecord) return null;
      
      // If image_url is already a full URL (starts with http), use it
      if (imageRecord.image_url && imageRecord.image_url.startsWith('http')) {
        return imageRecord.image_url;
      }
      
      // If it's a storage path, construct the full URL
      if (imageRecord.image_url) {
        return `${SUPABASE_CONFIG.url}/storage/v1/object/public/property-images/${imageRecord.image_url}`;
      }
      
      return null;
    };

    const mainImageUrl = getImageUrl(primaryImage);

    return {
      id: property.id,
      title: property.title,
      type: property.type,
      status: property.status,
      price: parseFloat(property.price),
      currency: property.currency,
      location: {
        area: property.area,
        city: property.city,
        country: property.country,
        coordinates: {
          lat: property.latitude ? parseFloat(property.latitude) : null,
          lng: property.longitude ? parseFloat(property.longitude) : null
        }
      },
      features: {
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        parking: property.parking,
        size: property.size,
        sizeUnit: property.size_unit
      },
      description: property.description,
      images: {
        main: mainImageUrl || `${SUPABASE_CONFIG.url}/storage/v1/object/public/property-images/placeholder/default-property.jpg`,
        gallery: galleryImages.map(img => getImageUrl(img)).filter(url => url)
      },
      amenities: property.amenities ? property.amenities.split(',').map(a => a.trim()) : [],
      yearBuilt: property.year_built,
      furnished: property.furnished,
      available: property.available,
      featured: property.featured,
      youtubeUrl: property.youtube_url || '',
      dateAdded: property.created_at ? property.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
    };
  }

  // Transform application format to database format
  transformPropertyToDatabase(appData) {
    return {
      title: appData.title,
      type: appData.type,
      status: appData.status,
      price: appData.price,
      currency: appData.currency || 'KES',
      area: appData.location.area,
      city: appData.location.city,
      country: appData.location.country || 'Kenya',
      latitude: appData.location.coordinates?.lat || null,
      longitude: appData.location.coordinates?.lng || null,
      bedrooms: appData.features.bedrooms,
      bathrooms: appData.features.bathrooms,
      parking: appData.features.parking,
      size: appData.features.size,
      size_unit: appData.features.sizeUnit || 'm²',
      description: appData.description,
      amenities: appData.amenities ? appData.amenities.join(', ') : null,
      year_built: appData.yearBuilt,
      furnished: appData.furnished !== undefined ? appData.furnished : false,
      available: appData.available !== undefined ? appData.available : true,
      featured: appData.featured !== undefined ? appData.featured : false,
      youtube_url: appData.youtubeUrl || null
    };
  }
}

// Create global instance
let supabaseManager;

// Initialize managers after class definition
function initializeManagers() {
  if (supabase) {
    supabaseManager = new SupabaseManager();
    
    // Make it globally available immediately
    window.supabaseManager = supabaseManager;
    
    console.log('✅ SupabaseManager created and made globally available');
    
    // Test connection when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
      supabaseManager.testConnection().then(result => {
        if (result.success) {
          console.log('✅ Supabase database connection successful');
          
          // Test if we can fetch properties
          supabaseManager.getAllProperties().then(properties => {
            console.log(`🔍 Database contains ${properties.length} properties`);
            if (properties.length > 0) {
              console.log('📋 Sample property from database:', properties[0]);
              // Test if youtube_url column exists
              if (properties[0].youtubeUrl !== undefined) {
                console.log('✅ YouTube URL column is available in database');
              } else {
                console.warn('⚠️ YouTube URL column might not exist in database');
              }
            } else {
              console.log('📭 Database is empty - no properties found');
            }
          }).catch(error => {
            console.error('❌ Error fetching properties:', error);
            if (error.message && error.message.includes('property_videos')) {
              console.error('💡 Hint: The property_videos table might still be referenced somewhere or may not exist');
            }
          });
        } else {
          console.error('❌ Supabase database connection failed:', result.message);
        }
      });
    });
  }
}

// Try to initialize immediately
if (!initializeSupabase()) {
  // If not available, wait for it
  let attempts = 0;
  const checkInterval = setInterval(() => {
    attempts++;
    if (initializeSupabase()) {
      clearInterval(checkInterval);
      initializeManagers();
    } else if (attempts > 50) {
      clearInterval(checkInterval);
      console.error('❌ Supabase client library not loaded after 5 seconds. Make sure to include the CDN script.');
    }
  }, 100);
} else {
  initializeManagers();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SupabaseManager, SUPABASE_CONFIG };
}