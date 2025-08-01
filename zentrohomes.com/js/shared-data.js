// Shared Data Management for Zentro Homes
// This file provides a centralized data management system for both admin and front-end

class SharedDataManager {
  constructor() {
    this.storageKey = 'zentro-properties-data';
    this.init();
  }

  init() {
    // Load data from localStorage if available, otherwise use default data
    const savedData = localStorage.getItem(this.storageKey);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Update the global apartmentsData object
        apartmentsData.apartments = parsedData;
      } catch (error) {
        console.error('Error parsing saved property data:', error);
      }
    }
  }

  // Save properties to localStorage
  saveProperties(properties) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(properties));
      // Update the global apartmentsData object
      apartmentsData.apartments = properties;
      return true;
    } catch (error) {
      console.error('Error saving property data:', error);
      return false;
    }
  }

  // Get all properties
  getProperties() {
    return apartmentsData.apartments;
  }

  // Add a new property
  addProperty(property) {
    const properties = this.getProperties();
    const newId = Math.max(...properties.map(p => p.id), 0) + 1;
    const newProperty = { id: newId, ...property };
    
    properties.push(newProperty);
    this.saveProperties(properties);
    return newProperty;
  }

  // Update an existing property
  updateProperty(id, updatedData) {
    const properties = this.getProperties();
    const index = properties.findIndex(p => p.id === id);
    
    if (index !== -1) {
      properties[index] = { ...properties[index], ...updatedData };
      this.saveProperties(properties);
      return properties[index];
    }
    
    return null;
  }

  // Delete a property
  deleteProperty(id) {
    const properties = this.getProperties();
    const filteredProperties = properties.filter(p => p.id !== id);
    
    if (filteredProperties.length < properties.length) {
      this.saveProperties(filteredProperties);
      return true;
    }
    
    return false;
  }

  // Get a single property by ID
  getPropertyById(id) {
    const properties = this.getProperties();
    return properties.find(p => p.id === id) || null;
  }

  // Clear all saved data and revert to default
  resetToDefault() {
    localStorage.removeItem(this.storageKey);
    location.reload();
  }
}

// Initialize the shared data manager
window.sharedDataManager = new SharedDataManager();