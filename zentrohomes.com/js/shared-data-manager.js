// Shared Data Manager for Zentro Homes
// This file manages data sharing between admin and front-end

class SharedDataManager {
  constructor() {
    // Initialize with data from apartments-data.js
    this.apartments = [...apartmentsData.apartments];
    this.filters = {...apartmentsData.filters};
    
    // Load any saved data from localStorage
    this.loadFromStorage();
    
    console.log('SharedDataManager initialized with', this.apartments.length, 'properties');
  }
  
  // Get all apartments
  getAllApartments() {
    return [...this.apartments];
  }
  
  // Get apartment by ID
  getApartmentById(id) {
    return this.apartments.find(apartment => apartment.id === id);
  }
  
  // Add new apartment
  addApartment(apartmentData) {
    // Generate new ID
    const newId = this.apartments.length > 0 
      ? Math.max(...this.apartments.map(a => a.id)) + 1 
      : 1;
    
    // Create new apartment with ID
    const newApartment = {
      id: newId,
      ...apartmentData
    };
    
    // Add to collection
    this.apartments.push(newApartment);
    
    // Save to storage
    this.saveToStorage();
    
    // Return the new apartment
    return newApartment;
  }
  
  // Update existing apartment
  updateApartment(id, apartmentData) {
    const index = this.apartments.findIndex(apartment => apartment.id === id);
    
    if (index !== -1) {
      // Update apartment data while preserving ID
      this.apartments[index] = {
        ...apartmentData,
        id: id
      };
      
      // Save to storage
      this.saveToStorage();
      
      return this.apartments[index];
    }
    
    return null;
  }
  
  // Delete apartment
  deleteApartment(id) {
    const index = this.apartments.findIndex(apartment => apartment.id === id);
    
    if (index !== -1) {
      // Remove apartment
      this.apartments.splice(index, 1);
      
      // Save to storage
      this.saveToStorage();
      
      return true;
    }
    
    return false;
  }
  
  // Add media to apartment
  addMediaToApartment(id, mediaType, mediaUrls) {
    const apartment = this.getApartmentById(id);
    
    if (apartment) {
      if (mediaType === 'photos') {
        // Add to gallery
        apartment.images.gallery = [...apartment.images.gallery, ...mediaUrls];
      } else if (mediaType === 'videos' && !apartment.videos) {
        // Initialize videos array if it doesn't exist
        apartment.videos = [...mediaUrls];
      } else if (mediaType === 'videos') {
        // Add to videos
        apartment.videos = [...apartment.videos, ...mediaUrls];
      }
      
      // Save to storage
      this.saveToStorage();
      
      return true;
    }
    
    return false;
  }
  
  // Save data to localStorage
  saveToStorage() {
    try {
      localStorage.setItem('zentro-apartments', JSON.stringify(this.apartments));
      console.log('Data saved to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  // Load data from localStorage
  loadFromStorage() {
    try {
      const savedData = localStorage.getItem('zentro-apartments');
      
      if (savedData) {
        this.apartments = JSON.parse(savedData);
        console.log('Data loaded from localStorage');
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }
  
  // Clear storage and reset to default data
  resetToDefault() {
    this.apartments = [...apartmentsData.apartments];
    localStorage.removeItem('zentro-apartments');
    console.log('Data reset to default');
  }
}

// Create global instance
window.sharedDataManager = new SharedDataManager();

// Update the global apartmentsData object to use the shared data
Object.defineProperty(window, 'apartmentsData', {
  get: function() {
    return {
      apartments: window.sharedDataManager.getAllApartments(),
      filters: window.sharedDataManager.filters
    };
  }
});