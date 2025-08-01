// Shared Data Manager with Supabase Integration for Zentro Homes
// This file manages data sharing between admin and front-end with database support

class SharedDataManagerSupabase {
  constructor() {
    // Initialize with fallback data
    this.apartments = [...apartmentsData.apartments];
    this.filters = {...apartmentsData.filters};
    this.isOnline = false;
    this.lastSync = null;
    
    this.init();
  }
  
  async init() {
    // Wait for Supabase to be ready
    await this.waitForSupabase();
    
    // Try to load from database
    await this.loadFromDatabase();
    
    console.log('SharedDataManagerSupabase initialized with', this.apartments.length, 'properties');
  }

  // Wait for Supabase to be initialized
  async waitForSupabase() {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    console.log('🔍 SharedDataManager: Waiting for supabaseManager...');
    
    while (!window.supabaseManager && attempts < maxAttempts) {
      if (attempts % 10 === 0) {
        console.log(`🔍 Attempt ${attempts}: supabaseManager=${!!window.supabaseManager}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (window.supabaseManager) {
      this.isOnline = true;
      console.log('✅ SharedDataManager: Connected to Supabase successfully');
    } else {
      console.warn('⚠️ SharedDataManager: Running in offline mode - supabaseManager not found after', attempts, 'attempts');
    }
  }

  // Load data from database
  async loadFromDatabase() {
    if (!this.isOnline || !window.supabaseManager) {
      console.log('📂 SharedDataManager: Using offline data - isOnline:', this.isOnline, 'supabaseManager:', !!window.supabaseManager);
      return;
    }

    try {
      console.log('🔄 SharedDataManager: Loading properties from database...');
      this.apartments = await window.supabaseManager.getAllProperties();
      this.lastSync = new Date();
      console.log(`✅ SharedDataManager: Synced ${this.apartments.length} properties from database`);
      
      // Log first property for verification
      if (this.apartments.length > 0) {
        console.log('📋 First property from database:', this.apartments[0]);
      }
    } catch (error) {
      console.error('❌ SharedDataManager: Failed to load from database:', error);
      // Keep using fallback data
    }
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
    if (this.isOnline && window.supabaseManager) {
      try {
        const newApartment = await window.supabaseManager.addProperty(apartmentData);
        
        // Update local cache
        this.apartments.push(newApartment);
        
        return newApartment;
      } catch (error) {
        console.error('Failed to add apartment to database:', error);
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
        dateAdded: new Date().toISOString().split('T')[0]
      };
      
      this.apartments.push(newApartment);
      this.saveToStorage();
      
      return newApartment;
    }
  }
  
  // Update apartment
  async updateApartment(id, apartmentData) {
    if (this.isOnline && window.supabaseManager) {
      try {
        const updatedApartment = await window.supabaseManager.updateProperty(id, apartmentData);
        
        // Update local cache
        const index = this.apartments.findIndex(a => a.id === parseInt(id));
        if (index !== -1) {
          this.apartments[index] = updatedApartment;
        }
        
        return updatedApartment;
      } catch (error) {
        console.error('Failed to update apartment in database:', error);
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
    if (this.isOnline && window.supabaseManager) {
      try {
        await window.supabaseManager.deleteProperty(id);
        
        // Update local cache
        this.apartments = this.apartments.filter(a => a.id !== parseInt(id));
        
        return true;
      } catch (error) {
        console.error('Failed to delete apartment from database:', error);
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
    if (this.isOnline && window.supabaseManager) {
      try {
        return await window.supabaseManager.searchProperties(searchTerm);
      } catch (error) {
        console.error('Database search failed, using local search:', error);
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
    if (this.isOnline && window.supabaseManager) {
      try {
        return await window.supabaseManager.getPropertiesByStatus(status);
      } catch (error) {
        console.error('Database query failed, using local filter:', error);
      }
    }
    
    // Fallback to local filter
    return this.apartments.filter(apt => apt.status === status);
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
    if (this.isOnline && window.supabaseManager) {
      try {
        return await window.supabaseManager.getStatistics();
      } catch (error) {
        console.error('Database stats failed, using local calculation:', error);
      }
    }
    
    // Fallback to local calculation
    const total = this.apartments.length;
    const forSale = this.apartments.filter(apt => apt.status === 'For Sale').length;
    const forRent = this.apartments.filter(apt => apt.status === 'For Rent').length;
    const averagePrice = total > 0 ? this.apartments.reduce((sum, apt) => sum + apt.price, 0) / total : 0;
    
    return {
      total,
      forSale,
      forRent,
      averagePrice
    };
  }
  
  // Sync with database (force refresh)
  async syncWithDatabase() {
    if (!this.isOnline || !window.supabaseManager) {
      console.log('Cannot sync - database not available');
      return false;
    }
    
    try {
      await this.loadFromDatabase();
      console.log('✅ Data synced with database');
      return true;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return false;
    }
  }
  
  // Check connection status
  async checkConnection() {
    if (!window.supabaseManager) {
      return { connected: false, message: 'Supabase not initialized' };
    }
    
    try {
      const result = await window.supabaseManager.testConnection();
      this.isOnline = result.success;
      return result;
    } catch (error) {
      this.isOnline = false;
      return { connected: false, message: error.message };
    }
  }
  
  // Save to localStorage (fallback)
  saveToStorage() {
    try {
      localStorage.setItem('zentro-apartments', JSON.stringify(this.apartments));
      localStorage.setItem('zentro-last-update', new Date().toISOString());
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }
  
  // Load from localStorage (fallback)
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('zentro-apartments');
      const lastUpdate = localStorage.getItem('zentro-last-update');
      
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
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }
  
  // Get connection info
  getConnectionInfo() {
    return {
      isOnline: this.isOnline,
      lastSync: this.lastSync,
      totalProperties: this.apartments.length,
      dataSource: this.isOnline ? 'database' : 'local'
    };
  }
}

// Initialize the shared data manager
let sharedDataManagerSupabase;

document.addEventListener('DOMContentLoaded', async function() {
  sharedDataManagerSupabase = new SharedDataManagerSupabase();
  
  // Make it globally available
  window.sharedDataManager = sharedDataManagerSupabase;
  
  // Initialize after Supabase is ready
  await sharedDataManagerSupabase.init();
  
  // Log connection status
  const connectionInfo = sharedDataManagerSupabase.getConnectionInfo();
  console.log('📊 Data Manager Status:', connectionInfo);
});