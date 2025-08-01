// Zentro Homes Admin Dashboard with Supabase Integration
class ZentroAdminSupabase {
  constructor() {
    this.properties = [];
    this.filteredProperties = [];
    this.currentEditingId = null;
    this.selectedFiles = {
      photos: [],
      videos: []
    };
    this.isLoading = false;

    this.init();
  }

  async init() {
    this.bindNavigation();
    this.bindPropertyEvents();
    this.bindMediaEvents();
    this.bindModalEvents();
    
    // Wait for Supabase to be initialized
    await this.waitForSupabase();
    
    // Load properties from Supabase
    await this.loadPropertiesFromDatabase();
    
    this.renderProperties();
    this.updateDashboard();
    this.populateMediaPropertySelect();
  }

  // Wait for Supabase to be initialized
  async waitForSupabase() {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (!window.supabaseManager && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.supabaseManager) {
      this.showNotification('Failed to connect to database. Using offline mode.', 'error');
      // Fallback to local data
      this.properties = [...apartmentsData.apartments];
      this.filteredProperties = [...this.properties];
    }
  }

  // Load properties from Supabase
  async loadPropertiesFromDatabase() {
    if (!window.supabaseManager) {
      console.warn('Supabase not available, using local data');
      this.properties = [...apartmentsData.apartments];
      this.filteredProperties = [...this.properties];
      return;
    }

    try {
      this.setLoading(true);
      this.properties = await window.supabaseManager.getAllProperties();
      this.filteredProperties = [...this.properties];
      console.log(`Loaded ${this.properties.length} properties from database`);
    } catch (error) {
      console.error('Error loading properties:', error);
      this.showNotification('Failed to load properties from database', 'error');
      // Fallback to local data
      this.properties = [...apartmentsData.apartments];
      this.filteredProperties = [...this.properties];
    } finally {
      this.setLoading(false);
    }
  }

  // Navigation handling
  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        this.switchSection(section);
      });
    });
  }

  switchSection(sectionName) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      item.classList.remove('bg-[#f0f2f5]');
    });

    const activeItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
      activeItem.classList.add('bg-[#f0f2f5]');
    }

    // Show/hide sections
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.add('hidden');
    });

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }
  }

  // Property management
  bindPropertyEvents() {
    // Add property button
    document.getElementById('add-property-btn').addEventListener('click', () => {
      this.openPropertyModal();
    });

    // Search
    document.getElementById('property-search').addEventListener('input', () => {
      this.filterProperties();
    });

    // Status filter clicks
    document.querySelectorAll('[id^="status-filter"]').forEach(filter => {
      filter.addEventListener('click', (e) => {
        e.preventDefault();
        const status = filter.dataset.status;
        this.filterByStatus(status);
      });
    });

    // Settings form
    document.getElementById('settings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
  }

  async filterByStatus(status) {
    if (!window.supabaseManager) {
      // Fallback to local filtering
      this.filteredProperties = this.properties.filter(property => property.status === status);
      this.renderProperties();
      return;
    }

    try {
      this.setLoading(true);
      this.filteredProperties = await window.supabaseManager.getPropertiesByStatus(status);
      this.renderProperties();
    } catch (error) {
      console.error('Error filtering properties:', error);
      this.showNotification('Error filtering properties', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async filterProperties() {
    const search = document.getElementById('property-search').value.toLowerCase().trim();
    
    if (!search) {
      await this.loadPropertiesFromDatabase();
      this.renderProperties();
      return;
    }

    if (!window.supabaseManager) {
      // Fallback to local filtering
      this.filteredProperties = this.properties.filter(property => {
        return property.title.toLowerCase().includes(search) ||
               property.location.area.toLowerCase().includes(search) ||
               property.location.city.toLowerCase().includes(search);
      });
      this.renderProperties();
      return;
    }

    try {
      this.setLoading(true);
      this.filteredProperties = await window.supabaseManager.searchProperties(search);
      this.renderProperties();
    } catch (error) {
      console.error('Error searching properties:', error);
      this.showNotification('Error searching properties', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  renderProperties() {
    const container = document.getElementById('properties-list');

    if (this.isLoading) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-zentro-gold mx-auto mb-4"></div>
          <p class="text-gray-500">Loading properties...</p>
        </div>
      `;
      return;
    }

    if (this.filteredProperties.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-gray-500">
            <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-8 0H3m2 0h6M9 7h6m-6 4h6m-6 4h6m-6 4h6"></path>
            </svg>
            <p class="text-lg font-medium">No properties found</p>
            <p class="text-sm mt-2">Try adjusting your search criteria or add a new property</p>
          </div>
        </div>
      `;
      return;
    }

    // Create a table view for the properties
    container.innerHTML = `
      <div class="overflow-hidden rounded-lg border border-[#dbe0e6] bg-white">
        <table class="w-full">
          <thead>
            <tr class="bg-white">
              <th class="px-4 py-3 text-left text-zentro-dark text-sm font-medium">ID</th>
              <th class="px-4 py-3 text-left text-zentro-dark text-sm font-medium">Image</th>
              <th class="px-4 py-3 text-left text-zentro-dark text-sm font-medium">Title</th>
              <th class="px-4 py-3 text-left text-zentro-dark text-sm font-medium">Location</th>
              <th class="px-4 py-3 text-left text-zentro-dark text-sm font-medium">Type</th>
              <th class="px-4 py-3 text-left text-zentro-dark text-sm font-medium">Status</th>
              <th class="px-4 py-3 text-left text-zentro-dark text-sm font-medium">Price</th>
              <th class="px-4 py-3 text-left text-zentro-dark text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredProperties.map(property => `
              <tr class="border-t border-t-[#dbe0e6]">
                <td class="h-[72px] px-4 py-2 text-zentro-dark text-sm font-normal">${property.id}</td>
                <td class="h-[72px] px-4 py-2">
                  <div class="w-16 h-16 rounded-lg overflow-hidden">
                    <img src="${property.images.main}" alt="${property.title}" class="w-full h-full object-cover" onerror="this.src='../wp-content/uploads/2025/02/unsplash.jpg'">
                  </div>
                </td>
                <td class="h-[72px] px-4 py-2 text-zentro-dark text-sm font-normal">${property.title}</td>
                <td class="h-[72px] px-4 py-2 text-gray-600 text-sm font-normal">${property.location.area}, ${property.location.city}</td>
                <td class="h-[72px] px-4 py-2 text-gray-600 text-sm font-normal">${property.type}</td>
                <td class="h-[72px] px-4 py-2">
                  <button class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 ${property.status === 'For Sale' ? 'bg-zentro-green/10 text-zentro-green' : 'bg-zentro-gold/10 text-zentro-gold'} text-sm font-medium">
                    <span class="truncate">${property.status}</span>
                  </button>
                </td>
                <td class="h-[72px] px-4 py-2 text-zentro-dark text-sm font-medium">${this.formatPrice(property.price, property.currency)}</td>
                <td class="h-[72px] px-4 py-2">
                  <div class="flex gap-2">
                    <button onclick="zentroAdmin.editProperty(${property.id})" class="text-zentro-dark text-sm font-bold tracking-[0.015em] hover:text-zentro-gold transition-colors">
                      Edit
                    </button>
                    <button onclick="zentroAdmin.deleteProperty(${property.id})" class="text-red-500 text-sm font-bold tracking-[0.015em] hover:text-red-600 transition-colors">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Modal handling
  bindModalEvents() {
    const modal = document.getElementById('property-modal');
    const form = document.getElementById('property-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const previewBtn = document.getElementById('preview-btn');

    // Close modal on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closePropertyModal();
      }
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
      this.closePropertyModal();
    });
    
    // Preview button
    previewBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.previewProperty();
    });

    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProperty();
    });
  }
  
  previewProperty() {
    // Same preview functionality as original, but with updated data structure
    const formData = this.getFormData();
    this.generatePreview(formData);
  }

  getFormData() {
    return {
      id: this.currentEditingId || 'new',
      title: document.getElementById('property-title').value || 'Property Title',
      type: document.getElementById('property-type').value || 'Villa',
      status: document.getElementById('property-status').value || 'For Sale',
      price: parseInt(document.getElementById('property-price').value) || 1000000,
      location: {
        area: document.getElementById('property-area').value || 'Area',
        city: document.getElementById('property-city').value || 'Nairobi',
        country: 'Kenya',
        coordinates: { lat: -1.2921, lng: 36.8219 }
      },
      features: {
        bedrooms: parseInt(document.getElementById('property-bedrooms').value) || 3,
        bathrooms: parseInt(document.getElementById('property-bathrooms').value) || 2,
        parking: parseInt(document.getElementById('property-parking').value) || 1,
        size: parseInt(document.getElementById('property-size').value) || 150,
        sizeUnit: 'm²'
      },
      description: document.getElementById('property-description').value || 'Property description',
      images: {
        main: document.getElementById('property-image').value || '../wp-content/uploads/2025/02/unsplash.jpg',
        gallery: []
      },
      amenities: document.getElementById('property-amenities').value.split(',').map(a => a.trim()).filter(a => a) || [],
      currency: 'KES',
      yearBuilt: 2023,
      furnished: true,
      available: true
    };
  }

  generatePreview(formData) {
    // Remove existing preview
    const existingPreview = document.getElementById('property-preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    const previewContainer = document.createElement('div');
    previewContainer.id = 'property-preview';
    previewContainer.className = 'mt-8 p-6 border-t border-[#dbe0e6]';
    
    const heading = document.createElement('h3');
    heading.className = 'text-zentro-dark text-lg font-bold mb-6';
    heading.textContent = 'Property Preview';
    
    const previewHTML = `
      <div class="property-card max-w-sm mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="relative">
          <img src="${formData.images.main}" alt="${formData.title}" class="w-full h-48 object-cover">
          <div class="absolute top-3 left-3">
            <span class="bg-zentro-green text-white px-2 py-1 rounded-md text-xs font-semibold">${formData.status}</span>
          </div>
          <div class="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded-md text-sm font-semibold">
            ${this.formatPrice(formData.price, formData.currency)}
          </div>
        </div>
        <div class="p-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">${formData.title}</h3>
          <p class="text-sm text-gray-600 mb-3">${formData.location.area}, ${formData.location.city}</p>
          <div class="flex justify-between text-sm text-gray-500 mb-3">
            <span>${formData.features.bedrooms} beds</span>
            <span>${formData.features.bathrooms} baths</span>
            <span>${formData.features.size}${formData.features.sizeUnit}</span>
          </div>
          <div class="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
            ${formData.type}
          </div>
        </div>
      </div>
      <p class="text-sm text-gray-500 text-center mt-4">This is how your property will appear on the website</p>
    `;
    
    previewContainer.appendChild(heading);
    previewContainer.innerHTML += previewHTML;
    document.getElementById('property-form').appendChild(previewContainer);
  }

  openPropertyModal(property = null) {
    const modal = document.getElementById('property-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('property-form');

    if (property) {
      modalTitle.textContent = 'Edit Property';
      this.currentEditingId = property.id;
      this.populatePropertyForm(property);
    } else {
      modalTitle.textContent = 'Add Property';
      this.currentEditingId = null;
      form.reset();
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }

  closePropertyModal() {
    const modal = document.getElementById('property-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
    this.currentEditingId = null;
    
    // Remove preview if exists
    const previewContainer = document.getElementById('property-preview');
    if (previewContainer) {
      previewContainer.remove();
    }
  }

  populatePropertyForm(property) {
    document.getElementById('property-title').value = property.title;
    document.getElementById('property-type').value = property.type;
    document.getElementById('property-status').value = property.status;
    document.getElementById('property-price').value = property.price;
    document.getElementById('property-area').value = property.location.area;
    document.getElementById('property-city').value = property.location.city;
    document.getElementById('property-bedrooms').value = property.features.bedrooms;
    document.getElementById('property-bathrooms').value = property.features.bathrooms;
    document.getElementById('property-parking').value = property.features.parking;
    document.getElementById('property-size').value = property.features.size;
    document.getElementById('property-description').value = property.description;
    document.getElementById('property-image').value = property.images.main;
    document.getElementById('property-amenities').value = property.amenities.join(', ');
  }

  async saveProperty() {
    const formData = this.getFormData();

    if (!window.supabaseManager) {
      this.showNotification('Database not available. Cannot save property.', 'error');
      return;
    }

    try {
      this.setLoading(true);
      
      if (this.currentEditingId && this.currentEditingId !== 'new') {
        // Update existing property
        await window.supabaseManager.updateProperty(this.currentEditingId, formData);
        this.showNotification('Property updated successfully!', 'success');
      } else {
        // Add new property
        await window.supabaseManager.addProperty(formData);
        this.showNotification('Property added successfully!', 'success');
      }

      this.closePropertyModal();
      await this.loadPropertiesFromDatabase();
      this.renderProperties();
      this.updateDashboard();
      this.populateMediaPropertySelect();
      
    } catch (error) {
      console.error('Error saving property:', error);
      this.showNotification('Error saving property: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async editProperty(id) {
    const property = this.properties.find(p => p.id === id);
    if (property) {
      this.openPropertyModal(property);
    }
  }

  async deleteProperty(id) {
    if (!confirm('Are you sure you want to delete this property?')) {
      return;
    }

    if (!window.supabaseManager) {
      this.showNotification('Database not available. Cannot delete property.', 'error');
      return;
    }

    try {
      this.setLoading(true);
      await window.supabaseManager.deleteProperty(id);
      
      await this.loadPropertiesFromDatabase();
      this.renderProperties();
      this.updateDashboard();
      this.populateMediaPropertySelect();
      this.showNotification('Property deleted successfully!', 'success');
      
    } catch (error) {
      console.error('Error deleting property:', error);
      this.showNotification('Error deleting property: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  // Media handling (simplified for now)
  bindMediaEvents() {
    // Basic media event binding - same as original but without upload functionality
    // This would need proper file upload service integration
    console.log('Media events bound - file upload requires additional backend setup');
  }

  populateMediaPropertySelect() {
    const select = document.getElementById('media-property-select');
    select.innerHTML = '<option value="">Select a property...</option>';

    this.properties.forEach(property => {
      const option = document.createElement('option');
      option.value = property.id;
      option.textContent = `${property.title} - ${property.location.area}`;
      select.appendChild(option);
    });
  }

  // Dashboard
  async updateDashboard() {
    if (!window.supabaseManager) {
      // Fallback to local calculation
      const totalProperties = this.properties.length;
      const forSaleCount = this.properties.filter(p => p.status === 'For Sale').length;
      const forRentCount = this.properties.filter(p => p.status === 'For Rent').length;
      const avgPrice = totalProperties > 0 ? this.properties.reduce((sum, p) => sum + p.price, 0) / totalProperties : 0;

      document.getElementById('total-properties').textContent = totalProperties;
      document.getElementById('for-sale-count').textContent = forSaleCount;
      document.getElementById('for-rent-count').textContent = forRentCount;
      document.getElementById('avg-price').textContent = this.formatPrice(avgPrice, 'KES');
      return;
    }

    try {
      const stats = await window.supabaseManager.getStatistics();
      
      document.getElementById('total-properties').textContent = stats.total;
      document.getElementById('for-sale-count').textContent = stats.forSale;
      document.getElementById('for-rent-count').textContent = stats.forRent;
      document.getElementById('avg-price').textContent = this.formatPrice(stats.averagePrice, 'KES');
      
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  }

  // Settings
  saveSettings() {
    const settings = {
      siteTitle: document.getElementById('site-title').value,
      contactEmail: document.getElementById('contact-email').value,
      contactPhone: document.getElementById('contact-phone').value
    };

    localStorage.setItem('zentro-settings', JSON.stringify(settings));
    this.showNotification('Settings saved successfully!', 'success');
  }

  // Utility functions
  formatPrice(price, currency) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency || 'KES',
      minimumFractionDigits: 0
    }).format(price);
  }

  setLoading(loading) {
    this.isLoading = loading;
    const addButton = document.getElementById('add-property-btn');
    if (addButton) {
      addButton.disabled = loading;
      addButton.textContent = loading ? 'Loading...' : 'Add Property';
    }
  }

  // Notifications
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-300 transform translate-x-full`;

    switch (type) {
      case 'success':
        notification.className += ' bg-zentro-green';
        break;
      case 'error':
        notification.className += ' bg-red-500';
        break;
      case 'info':
      default:
        notification.className += ' bg-zentro-dark';
        break;
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);

    // Remove after 4 seconds
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  window.zentroAdmin = new ZentroAdminSupabase();
});