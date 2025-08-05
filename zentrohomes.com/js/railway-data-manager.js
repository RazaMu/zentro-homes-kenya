// Railway Data Manager for Zentro Homes
// Railway API integration for property data management

class RailwayDataManager {
  constructor() {
    // Initialize with fallback data
    this.apartments = [];
    this.filters = {};
    this.isOnline = false;
    this.lastSync = null;
    this.client = null;
    this.isInitialized = false;
    
    // Don't auto-init in constructor since we need to control timing
  }
  
  // Safe JSON parser that handles invalid JSON gracefully
  safeJSONParse(jsonString, fallback = null) {
    try {
      return JSON.parse(jsonString || (Array.isArray(fallback) ? '[]' : '{}'));
    } catch (error) {
      // If it's a string that looks like a comma-separated list, convert to array silently
      if (typeof jsonString === 'string' && Array.isArray(fallback)) {
        // Check if it contains commas - likely a comma-separated list (expected behavior)
        if (jsonString.includes(',')) {
          return jsonString.split(',').map(item => item.trim()).filter(item => item.length > 0);
        }
        // Log warning only for unexpected JSON parsing failures
        console.warn('⚠️ JSON Parse Error:', error.message, 'Raw value:', jsonString);
      }
      return fallback;
    }
  }

  // Unified image URL processing method for Railway uploads
  getImageUrl(imageData) {
    if (!imageData) {
      console.log('🔍 getImageUrl: Input is null/undefined');
      return null;
    }
    
    console.log('🔍 getImageUrl: Processing input type=', typeof imageData, 'value=', imageData);
    
    // Debug logging for troubleshooting
    if (Array.isArray(imageData) && imageData.length > 0) {
      console.log('🔍 getImageUrl: Processing array, first item:', imageData[0]);
    }
    
    // Handle Railway client URL helper if available
    if (window.railwayClient && window.railwayClient.getImageUrl) {
      return window.railwayClient.getImageUrl(imageData);
    }
    
    // Handle array of images - get first image
    if (Array.isArray(imageData) && imageData.length > 0) {
      return this.getImageUrl(imageData[0]);
    }
    
    // Handle string URLs
    if (typeof imageData === 'string') {
      // Handle base64 data URLs (admin stored as fallback)
      if (imageData.startsWith('data:image/')) {
        console.log('🔍 getImageUrl: Found base64 data URL, using directly');
        return imageData;
      }
      // Railway Volume Storage URLs - convert to full URL
      if (imageData.startsWith('/uploads/')) {
        return window.location.origin + imageData;
      }
      // Already a full URL or relative path
      return imageData;
    }
    
    // Handle object with url property
    if (imageData && typeof imageData === 'object' && imageData.url) {
      const url = imageData.url;
      if (typeof url === 'string') {
        // Handle base64 data URLs (admin stored as fallback)
        if (url.startsWith('data:image/')) {
          console.log('🔍 getImageUrl: Found base64 data URL in object, using directly');
          return url;
        }
        // Railway Volume Storage URLs
        if (url.startsWith('/uploads/')) {
          return window.location.origin + url;
        }
        return url;
      }
    }
    
    // Handle Railway API format with file path
    if (imageData && typeof imageData === 'object' && imageData.path) {
      const path = imageData.path;
      if (typeof path === 'string') {
        if (path.startsWith('/uploads/')) {
          return window.location.origin + path;
        }
        return path;
      }
    }
    
    // Handle Railway API format with direct file property
    if (imageData && typeof imageData === 'object' && imageData.file) {
      const file = imageData.file;
      if (typeof file === 'string') {
        if (file.startsWith('/uploads/')) {
          return window.location.origin + file;
        }
        return file;
      }
    }
    
    // Handle Railway API image object with filename
    if (imageData && typeof imageData === 'object' && imageData.filename) {
      const filename = imageData.filename;
      if (typeof filename === 'string') {
        if (filename.startsWith('/uploads/')) {
          return window.location.origin + filename;
        } else {
          return window.location.origin + '/uploads/' + filename;
        }
      }
    }
    
    console.log('⚠️ getImageUrl: Could not process image data:', imageData);
    console.log('⚠️ getImageUrl: imageData type:', typeof imageData, 'keys:', Object.keys(imageData || {}));
    return null;
  }

  // Process image array from Railway API with proper fallbacks
  processImageArray(imageData) {
    if (!imageData) return [];
    
    if (Array.isArray(imageData)) {
      return imageData
        .filter(img => img !== null && img !== undefined && img !== '')
        .map(img => this.getImageUrl(img))
        .filter(url => url !== null);
    }
    
    if (typeof imageData === 'string') {
      if (imageData.trim() === '' || imageData === 'null') return [];
      try {
        const parsed = JSON.parse(imageData);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(img => img !== null && img !== undefined && img !== '')
            .map(img => this.getImageUrl(img))
            .filter(url => url !== null);
        }
      } catch {
        // Treat as comma-separated string
        return imageData.split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0 && item !== 'null')
          .map(img => this.getImageUrl(img))
          .filter(url => url !== null);
      }
    }
    
    return [];
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
        // Debug: Log raw Railway API response structure
        if (response.properties.length > 0) {
          console.log('🔍 Raw Railway API property structure:', response.properties[0]);
          console.log('🔍 Raw image fields:', {
            main_image: response.properties[0].main_image,
            gallery_images: response.properties[0].gallery_images,
            images: response.properties[0].images
          });
        }
        
        // Additional debugging for image structure
        if (response.properties.length > 0 && response.properties[0].images && response.properties[0].images.length > 0) {
          console.log('🔍 DETAILED: First 3 image items structure:', response.properties[0].images.slice(0, 3));
          console.log('🔍 DETAILED: First image object keys:', Object.keys(response.properties[0].images[0] || {}));
          console.log('🔍 DETAILED: First image .url property:', response.properties[0].images[0]?.url);
          console.log('🔍 DETAILED: Processing first image with getImageUrl:', this.getImageUrl(response.properties[0].images[0]));
        }
        
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
        images: this.processImageArray(property.images || property.gallery_images),
        videos: Array.isArray(property.videos) ? property.videos : 
                (typeof property.videos === 'string' ? this.safeJSONParse(property.videos, []) : []),
        virtualTour: property.virtual_tour_url,
        youtubeUrl: property.youtube_url
      },
      
      amenities: Array.isArray(property.amenities) ? property.amenities : 
                 (typeof property.amenities === 'string' ? this.safeJSONParse(property.amenities, []) : []),
      
      seo: {
        metaTitle: property.meta_title,
        metaDescription: property.meta_description,
        metaKeywords: Array.isArray(property.meta_keywords) ? property.meta_keywords :
                      (typeof property.meta_keywords === 'string' ? this.safeJSONParse(property.meta_keywords, []) : [])
      },
      
      // Legacy compatibility fields
      description: property.description,
      main_image: this.getImageUrl(property.main_image) || this.getImageUrl(property.images) || this.getImageUrl(property.gallery_images) || '/uploads/placeholder.jpg',
      images: this.processImageArray(property.images || property.gallery_images).length > 0 ? this.processImageArray(property.images || property.gallery_images) : ['wp-content/uploads/2025/02/placeholder.jpg'],
      
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
      // Basic info
      title: apartment.title || '',
      slug: apartment.slug || this.generateSlug(apartment.title || ''),
      uuid: apartment.uuid || this.generateUUID(),
      type: apartment.type || '',
      status: apartment.status || '',
      price: parseFloat(apartment.price) || 0,
      currency: apartment.currency || 'KES',
      
      // Location data
      location_area: apartment.location?.area || apartment.area || '',
      location_city: apartment.location?.city || apartment.city || '',
      location_country: apartment.location?.country || apartment.country || 'Kenya',
      coordinates_lat: apartment.location?.coordinates?.lat ? parseFloat(apartment.location.coordinates.lat) : null,
      coordinates_lng: apartment.location?.coordinates?.lng ? parseFloat(apartment.location.coordinates.lng) : null,
      
      // Features
      bedrooms: parseInt(apartment.features?.bedrooms || apartment.bedrooms) || 0,
      bathrooms: parseInt(apartment.features?.bathrooms || apartment.bathrooms) || 0,
      parking: parseInt(apartment.features?.parking || apartment.parking) || 0,
      size: parseFloat(apartment.features?.size || apartment.size) || 0,
      size_unit: apartment.features?.sizeUnit || apartment.sizeUnit || 'm²',
      year_built: apartment.details?.yearBuilt || apartment.yearBuilt ? parseInt(apartment.details?.yearBuilt || apartment.yearBuilt) : null,
      furnished: apartment.details?.furnished !== false && apartment.furnished !== false,
      
      // Content
      description: apartment.description || apartment.details?.description || '',
      short_description: apartment.details?.shortDescription || apartment.shortDescription || '',
      main_image: apartment.main_image || (apartment.images && Array.isArray(apartment.images) ? apartment.images[0] : null) || (apartment.media?.images?.[0]) || null,
      gallery_images: apartment.images || apartment.media?.images || apartment.gallery_images || [],
      videos: apartment.media?.videos || [],
      virtual_tour_url: apartment.media?.virtualTour || apartment.virtualTour || null,
      youtube_url: apartment.media?.youtubeUrl || apartment.youtubeUrl || null,
      amenities: apartment.amenities || [],
      features: apartment.customFeatures || apartment.features || {},
      
      // SEO
      meta_title: apartment.seo?.metaTitle || apartment.metaTitle || apartment.title || '',
      meta_description: apartment.seo?.metaDescription || apartment.metaDescription || apartment.description || '',
      meta_keywords: apartment.seo?.metaKeywords || apartment.metaKeywords || [],
      
      // Status
      available: apartment.available !== false,
      featured: apartment.featured === true,
      published: apartment.published !== false
    };
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  generateUUID() {
    return 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
  
  // Save to localStorage (fallback) - exclude large image data
  saveToStorage() {
    try {
      // Only save essential data to avoid quota issues
      const minimalData = this.apartments.map(property => ({
        id: property.id,
        uuid: property.uuid,
        title: property.title,
        slug: property.slug,
        type: property.type,
        status: property.status,
        price: property.price,
        currency: property.currency,
        location: property.location,
        features: property.features,
        description: property.description ? property.description.substring(0, 200) + '...' : '',
        // Keep only the main image URL, not full image objects
        mainImageUrl: property.media?.images?.[0]?.url || property.images?.main?.url || null,
        available: property.available,
        featured: property.featured,
        published: property.published,
        dateAdded: property.dateAdded
      }));
      
      localStorage.setItem('zentro-apartments-railway', JSON.stringify(minimalData));
      localStorage.setItem('zentro-last-update-railway', new Date().toISOString());
      console.log('💾 Saved minimal property data to localStorage (without large images)');
    } catch (error) {
      console.warn('Failed to save to localStorage:', error.message);
      // If still failing, just skip localStorage caching
      localStorage.removeItem('zentro-apartments-railway');
      console.log('💾 Skipped localStorage due to quota issues');
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
          this.lastSync = lastUpdate ? new Date(lastUpdate) : new Date(); // Set lastSync from stored data
          console.log(`Loaded ${this.apartments.length} properties from localStorage`);
          
          if (lastUpdate) {
            console.log(`Last updated: ${new Date(lastUpdate).toLocaleString()}`);
          }
        }
      }
      
      // Fallback to apartments-data if no stored data
      if (this.apartments.length === 0 && window.apartmentsData) {
        this.apartments = [...window.apartmentsData.apartments];
        this.lastSync = new Date(); // Set lastSync for fallback data too
        console.log(`Loaded ${this.apartments.length} properties from fallback data`);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      // Use apartments-data as final fallback
      if (window.apartmentsData) {
        this.apartments = [...window.apartmentsData.apartments];
        this.lastSync = new Date(); // Set lastSync for fallback data too
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
      dataSource: this.isOnline ? 'Railway API' : 'local storage',
      isInitialized: this.isInitialized
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
  
  // Make it globally available BEFORE initialization
  window.sharedDataManager = railwayDataManager;
  window.railwayDataManager = railwayDataManager;
  
  // Initialize after Railway client is ready
  console.log('🔄 Starting Railway Data Manager initialization...');
  await railwayDataManager.init();
  
  // Signal that initialization is complete
  railwayDataManager.isInitialized = true;
  
  // Log connection status
  const connectionInfo = railwayDataManager.getConnectionInfo();
  console.log('🚀 Railway Data Manager Status:', connectionInfo);
  
  // Dispatch custom event to notify other components
  window.dispatchEvent(new CustomEvent('railwayDataManagerReady', { 
    detail: connectionInfo 
  }));
});

// Export for compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RailwayDataManager;
}