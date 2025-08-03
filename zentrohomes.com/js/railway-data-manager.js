// Railway Data Manager for Zentro Homes
// Replaces the Supabase data manager with Railway API integration

class RailwayDataManager {
  constructor() {
    // Initialize with fallback data
    this.apartments = [];
    this.filters = {};
    this.isOnline = false;
    this.lastSync = null;
    this.client = null;
    
    this.init();
  }
  
  async init() {
    // Wait for Railway client to be ready
    await this.waitForRailwayClient();
    
    // Try to load from Railway API
    await this.loadFromAPI();
    
    console.log('RailwayDataManager initialized with', this.apartments.length, 'properties');
  }

  // Wait for Railway client to be initialized
  async waitForRailwayClient() {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    console.log('🔍 RailwayDataManager: Waiting for railwayClient...');
    
    while (!window.railwayClient && attempts < maxAttempts) {
      if (attempts % 10 === 0) {
        console.log(`🔍 Attempt ${attempts}: railwayClient=${!!window.railwayClient}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (window.railwayClient) {
      this.client = window.railwayClient;
      this.isOnline = true;
      console.log('✅ RailwayDataManager: Connected to Railway API successfully');
    } else {
      console.warn('⚠️ RailwayDataManager: Running in offline mode - railwayClient not found after', attempts, 'attempts');
      this.loadFromStorage(); // Load fallback data
    }
  }

  // Load data from Railway API
  async loadFromAPI() {
    if (!this.isOnline || !this.client) {
      console.log('📂 RailwayDataManager: Using offline data - isOnline:', this.isOnline, 'client:', !!this.client);
      return;
    }

    try {
      console.log('🔄 RailwayDataManager: Loading properties from Railway API...');
      const response = await this.client.getProperties({ published: true, available: true });
      
      if (response.properties) {
        this.apartments = this.convertToLegacyFormat(response.properties);
        this.lastSync = new Date();
        console.log(`✅ RailwayDataManager: Synced ${this.apartments.length} properties from Railway API`);
        
        // Save to storage as backup
        this.saveToStorage();
        
        // Log first property for verification
        if (this.apartments.length > 0) {
          console.log('📋 First property from Railway API:', this.apartments[0]);
        }
      }
    } catch (error) {
      console.error('❌ RailwayDataManager: Failed to load from Railway API:', error);
      // Try to load from storage as fallback
      this.loadFromStorage();
    }
  }

  // Convert Railway API format to legacy apartment format for compatibility
  convertToLegacyFormat(properties) {
    return properties.map(property => ({
      id: property.id,
      uuid: property.uuid,
      title: property.title,
      slug: property.slug,
      type: property.type,
      status: property.status,
      price: property.price,
      currency: property.currency || 'KES',
      
      location: {
        area: property.location_area,
        city: property.location_city,
        country: property.location_country || 'Kenya',
        coordinates: {
          lat: property.coordinates_lat,
          lng: property.coordinates_lng
        }
      },
      
      features: {
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        parking: property.parking || 0,
        size: property.size,
        sizeUnit: property.size_unit || 'm²'
      },
      
      details: {
        yearBuilt: property.year_built,
        furnished: property.furnished,
        description: property.description,
        shortDescription: property.short_description
      },
      
      media: {
        images: Array.isArray(property.images) ? property.images : 
                (typeof property.images === 'string' ? JSON.parse(property.images || '[]') : []),
        videos: Array.isArray(property.videos) ? property.videos : 
                (typeof property.videos === 'string' ? JSON.parse(property.videos || '[]') : []),
        virtualTour: property.virtual_tour_url,
        youtubeUrl: property.youtube_url
      },
      
      amenities: Array.isArray(property.amenities) ? property.amenities : 
                 (typeof property.amenities === 'string' ? JSON.parse(property.amenities || '[]') : []),
      
      seo: {
        metaTitle: property.meta_title,
        metaDescription: property.meta_description,
        metaKeywords: Array.isArray(property.meta_keywords) ? property.meta_keywords :
                      (typeof property.meta_keywords === 'string' ? JSON.parse(property.meta_keywords || '[]') : [])
      },
      
      // Legacy compatibility fields
      description: property.description,
      images: Array.isArray(property.images) ? property.images : 
              (typeof property.images === 'string' ? JSON.parse(property.images || '[]') : []),
      
      // Status fields
      available: property.available,
      featured: property.featured,
      published: property.published,
      viewsCount: property.views_count || 0,
      
      // Timestamps
      dateAdded: property.created_at ? property.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      createdAt: property.created_at,
      updatedAt: property.updated_at,
      publishedAt: property.published_at
    }));
  }

  // Convert legacy format back to Railway API format
  convertFromLegacyFormat(apartment) {
    return {
      title: apartment.title,
      type: apartment.type,
      status: apartment.status,
      price: apartment.price,
      currency: apartment.currency || 'KES',
      
      location_area: apartment.location?.area || '',
      location_city: apartment.location?.city || '',
      location_country: apartment.location?.country || 'Kenya',
      coordinates_lat: apartment.location?.coordinates?.lat,
      coordinates_lng: apartment.location?.coordinates?.lng,
      
      bedrooms: apartment.features?.bedrooms || 0,
      bathrooms: apartment.features?.bathrooms || 0,
      parking: apartment.features?.parking || 0,
      size: apartment.features?.size || 0,
      size_unit: apartment.features?.sizeUnit || 'm²',
      
      year_built: apartment.details?.yearBuilt,
      furnished: apartment.details?.furnished !== false,
      description: apartment.description || apartment.details?.description || '',
      short_description: apartment.details?.shortDescription || apartment.shortDescription,
      
      images: apartment.images || apartment.media?.images || [],
      videos: apartment.media?.videos || [],
      virtual_tour_url: apartment.media?.virtualTour,
      youtube_url: apartment.media?.youtubeUrl,
      
      amenities: apartment.amenities || [],
      features: apartment.customFeatures || {},
      
      meta_title: apartment.seo?.metaTitle,
      meta_description: apartment.seo?.metaDescription,
      meta_keywords: apartment.seo?.metaKeywords || [],
      
      available: apartment.available !== false,
      featured: apartment.featured === true,
      published: apartment.published !== false
    };
  }

  // Get all apartments
  getAllApartments() {
    return [...this.apartments];
  }
  
  // Get apartment by ID
  getApartmentById(id) {
    return this.apartments.find(apartment => apartment.id === parseInt(id));
  }
  
  // Add new apartment
  async addApartment(apartmentData) {
    if (this.isOnline && this.client) {
      try {
        const railwayData = this.convertFromLegacyFormat(apartmentData);
        const response = await this.client.createProperty(railwayData);
        
        if (response.property) {
          const newApartment = this.convertToLegacyFormat([response.property])[0];
          // Update local cache
          this.apartments.push(newApartment);
          this.saveToStorage();
          return newApartment;
        }
        
        throw new Error('Invalid response from API');
      } catch (error) {
        console.error('Failed to add apartment to Railway API:', error);
        throw error;
      }
    } else {
      // Offline mode - add to local array
      const newId = this.apartments.length > 0 
        ? Math.max(...this.apartments.map(a => a.id)) + 1 
        : 1;
      
      const newApartment = {
        id: newId,
        ...apartmentData,
        dateAdded: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };
      
      this.apartments.push(newApartment);
      this.saveToStorage();
      
      return newApartment;
    }
  }
  
  // Update apartment
  async updateApartment(id, apartmentData) {
    if (this.isOnline && this.client) {
      try {
        const railwayData = this.convertFromLegacyFormat(apartmentData);
        const response = await this.client.updateProperty(id, railwayData);
        
        if (response.property) {
          // Update local cache
          const index = this.apartments.findIndex(a => a.id === parseInt(id));
          if (index !== -1) {
            this.apartments[index] = { ...this.apartments[index], ...apartmentData };
            this.saveToStorage();
          }
          
          return this.apartments[index];
        }
        
        throw new Error('Invalid response from API');
      } catch (error) {
        console.error('Failed to update apartment in Railway API:', error);
        throw error;
      }
    } else {
      // Offline mode - update local array
      const index = this.apartments.findIndex(a => a.id === parseInt(id));
      if (index !== -1) {
        this.apartments[index] = { ...this.apartments[index], ...apartmentData };
        this.saveToStorage();
        return this.apartments[index];
      }
      throw new Error('Apartment not found');
    }
  }
  
  // Delete apartment
  async deleteApartment(id) {
    if (this.isOnline && this.client) {
      try {
        await this.client.deleteProperty(id);
        
        // Update local cache
        this.apartments = this.apartments.filter(a => a.id !== parseInt(id));
        this.saveToStorage();
        
        return true;
      } catch (error) {
        console.error('Failed to delete apartment from Railway API:', error);
        throw error;
      }
    } else {
      // Offline mode - remove from local array
      this.apartments = this.apartments.filter(a => a.id !== parseInt(id));
      this.saveToStorage();
      return true;
    }
  }
  
  // Filter apartments by criteria
  async filterApartments(criteria) {
    if (this.isOnline && this.client) {
      try {
        // Convert criteria to Railway API format
        const railwayFilters = {};
        
        if (criteria.status) railwayFilters.status = criteria.status;
        if (criteria.type) railwayFilters.type = criteria.type;
        if (criteria.location) railwayFilters.location = criteria.location;
        if (criteria.minPrice) railwayFilters.min_price = criteria.minPrice;
        if (criteria.maxPrice) railwayFilters.max_price = criteria.maxPrice;
        if (criteria.bedrooms) railwayFilters.bedrooms = criteria.bedrooms;
        
        const response = await this.client.getProperties(railwayFilters);
        return this.convertToLegacyFormat(response.properties || []);
      } catch (error) {
        console.error('API filter failed, using local filter:', error);
      }
    }
    
    // Fallback to local filtering
    let filteredApartments = [...this.apartments];
    
    // Apply filters
    if (criteria.status) {
      filteredApartments = filteredApartments.filter(apt => apt.status === criteria.status);
    }
    
    if (criteria.type) {
      filteredApartments = filteredApartments.filter(apt => apt.type === criteria.type);
    }
    
    if (criteria.location) {
      filteredApartments = filteredApartments.filter(apt => 
        apt.location.area.toLowerCase().includes(criteria.location.toLowerCase()) ||
        apt.location.city.toLowerCase().includes(criteria.location.toLowerCase())
      );
    }
    
    if (criteria.minPrice) {
      filteredApartments = filteredApartments.filter(apt => apt.price >= criteria.minPrice);
    }
    
    if (criteria.maxPrice) {
      filteredApartments = filteredApartments.filter(apt => apt.price <= criteria.maxPrice);
    }
    
    if (criteria.bedrooms) {
      filteredApartments = filteredApartments.filter(apt => apt.features.bedrooms >= criteria.bedrooms);
    }
    
    if (criteria.search) {
      const searchTerm = criteria.search.toLowerCase();
      filteredApartments = filteredApartments.filter(apt =>
        apt.title.toLowerCase().includes(searchTerm) ||
        apt.description.toLowerCase().includes(searchTerm) ||
        apt.location.area.toLowerCase().includes(searchTerm) ||
        apt.location.city.toLowerCase().includes(searchTerm)
      );
    }
    
    return filteredApartments;
  }
  
  // Search apartments
  async searchApartments(searchTerm) {
    if (this.isOnline && this.client) {
      try {
        const response = await this.client.searchProperties(searchTerm);
        return this.convertToLegacyFormat(response.results || []);
      } catch (error) {
        console.error('API search failed, using local search:', error);
      }
    }
    
    // Fallback to local search
    const term = searchTerm.toLowerCase();
    return this.apartments.filter(apt =>
      apt.title.toLowerCase().includes(term) ||
      apt.description.toLowerCase().includes(term) ||
      apt.location.area.toLowerCase().includes(term) ||
      apt.location.city.toLowerCase().includes(term)
    );
  }
  
  // Get apartments by status
  async getApartmentsByStatus(status) {
    if (this.isOnline && this.client) {
      try {
        const response = await this.client.getProperties({ status });
        return this.convertToLegacyFormat(response.properties || []);
      } catch (error) {
        console.error('API query failed, using local filter:', error);
      }
    }
    
    // Fallback to local filter
    return this.apartments.filter(apt => apt.status === status);
  }

  // Get featured properties
  async getFeaturedProperties(limit = 6) {
    if (this.isOnline && this.client) {
      try {
        const response = await this.client.getFeaturedProperties(limit);
        return this.convertToLegacyFormat(response || []);
      } catch (error) {
        console.error('API query failed, using local filter:', error);
      }
    }
    
    // Fallback to local filter
    return this.apartments
      .filter(apt => apt.featured)
      .slice(0, limit);
  }

  // Get properties by type
  async getPropertiesByType(type, limit = 12) {
    if (this.isOnline && this.client) {
      try {
        const response = await this.client.getPropertiesByType(type, limit);
        return this.convertToLegacyFormat(response.properties || []);
      } catch (error) {
        console.error('API query failed, using local filter:', error);
      }
    }
    
    // Fallback to local filter
    return this.apartments
      .filter(apt => apt.type === type)
      .slice(0, limit);
  }
  
  // Get unique filter options
  getFilterOptions() {
    const types = [...new Set(this.apartments.map(apt => apt.type))];
    const locations = [...new Set(this.apartments.map(apt => apt.location.area))];
    const cities = [...new Set(this.apartments.map(apt => apt.location.city))];
    const statuses = [...new Set(this.apartments.map(apt => apt.status))];
    
    return {
      types,
      locations,
      cities,  
      statuses,
      priceRange: {
        min: Math.min(...this.apartments.map(apt => apt.price)),
        max: Math.max(...this.apartments.map(apt => apt.price))
      },
      bedroomRange: {
        min: Math.min(...this.apartments.map(apt => apt.features.bedrooms)),
        max: Math.max(...this.apartments.map(apt => apt.features.bedrooms))
      }
    };
  }
  
  // Get statistics
  async getStatistics() {
    if (this.isOnline && this.client) {
      try {
        const response = await this.client.getPropertyStats();
        return {
          total: response.total_properties || 0,
          forSale: response.for_sale_count || 0,
          forRent: response.for_rent_count || 0,
          averagePrice: response.average_price || 0,
          featured: response.featured_count || 0,
          totalViews: response.total_views || 0
        };
      } catch (error) {
        console.error('API stats failed, using local calculation:', error);
      }
    }
    
    // Fallback to local calculation
    const total = this.apartments.length;
    const forSale = this.apartments.filter(apt => apt.status === 'For Sale').length;
    const forRent = this.apartments.filter(apt => apt.status === 'For Rent').length;
    const averagePrice = total > 0 ? this.apartments.reduce((sum, apt) => sum + apt.price, 0) / total : 0;
    const featured = this.apartments.filter(apt => apt.featured).length;
    const totalViews = this.apartments.reduce((sum, apt) => sum + (apt.viewsCount || 0), 0);
    
    return {
      total,
      forSale,
      forRent,
      averagePrice,
      featured,
      totalViews
    };
  }
  
  // Sync with Railway API (force refresh)
  async syncWithAPI() {
    if (!this.isOnline || !this.client) {
      console.log('Cannot sync - Railway API not available');
      return false;
    }
    
    try {
      await this.loadFromAPI();
      console.log('✅ Data synced with Railway API');
      return true;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return false;
    }
  }
  
  // Check connection status
  async checkConnection() {
    if (!this.client) {
      return { connected: false, message: 'Railway client not initialized' };
    }
    
    try {
      const result = await this.client.healthCheck();
      this.isOnline = result.status === 'healthy';
      return { 
        connected: this.isOnline, 
        message: result.status === 'healthy' ? 'Connected to Railway API' : 'Railway API unhealthy',
        details: result
      };
    } catch (error) {
      this.isOnline = false;
      return { connected: false, message: error.message };
    }
  }
  
  // Save to localStorage (fallback)
  saveToStorage() {
    try {
      localStorage.setItem('zentro-apartments-railway', JSON.stringify(this.apartments));
      localStorage.setItem('zentro-last-update-railway', new Date().toISOString());
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }
  
  // Load from localStorage (fallback)
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('zentro-apartments-railway');
      const lastUpdate = localStorage.getItem('zentro-last-update-railway');
      
      if (stored) {
        const storedApartments = JSON.parse(stored);
        if (storedApartments.length > 0) {
          this.apartments = storedApartments;
          console.log(`Loaded ${this.apartments.length} properties from localStorage`);
          
          if (lastUpdate) {
            console.log(`Last updated: ${new Date(lastUpdate).toLocaleString()}`);
          }
        }
      }
      
      // Fallback to apartments-data if no stored data
      if (this.apartments.length === 0 && window.apartmentsData) {
        this.apartments = [...window.apartmentsData.apartments];
        console.log(`Loaded ${this.apartments.length} properties from fallback data`);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      // Use apartments-data as final fallback
      if (window.apartmentsData) {
        this.apartments = [...window.apartmentsData.apartments];
        console.log(`Using fallback data: ${this.apartments.length} properties`);
      }
    }
  }
  
  // Get connection info
  getConnectionInfo() {
    return {
      isOnline: this.isOnline,
      lastSync: this.lastSync,
      totalProperties: this.apartments.length,
      dataSource: this.isOnline ? 'Railway API' : 'local storage'
    };
  }

  // Submit contact inquiry
  async submitContactInquiry(inquiryData) {
    if (this.isOnline && this.client) {
      try {
        return await this.client.submitInquiry(inquiryData);
      } catch (error) {
        console.error('Failed to submit inquiry via Railway API:', error);
        throw error;
      }
    } else {
      throw new Error('Cannot submit inquiry - Railway API not available');
    }
  }
}

// Initialize the Railway data manager
let railwayDataManager;

document.addEventListener('DOMContentLoaded', async function() {
  railwayDataManager = new RailwayDataManager();
  
  // Make it globally available (replacing the Supabase manager)
  window.sharedDataManager = railwayDataManager;
  window.railwayDataManager = railwayDataManager;
  
  // Initialize after Railway client is ready
  await railwayDataManager.init();
  
  // Log connection status
  const connectionInfo = railwayDataManager.getConnectionInfo();
  console.log('🚀 Railway Data Manager Status:', connectionInfo);
});

// Export for compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RailwayDataManager;
}