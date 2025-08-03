// Zentro Homes Admin Dashboard with Railway Integration
class ZentroAdminRailway {
  constructor() {
    this.properties = [];
    this.filteredProperties = [];
    this.contactInquiries = [];
    this.currentEditingId = null;
    this.selectedFiles = {
      photos: [],
      videos: []
    };
    this.isLoading = false;
    this.isLoggedIn = false;
    this.currentUser = null;
    this.client = null;

    this.init();
  }

  async init() {
    this.bindNavigation();
    this.bindPropertyEvents();
    this.bindMediaEvents();
    this.bindModalEvents();
    this.bindAuthEvents();
    
    // Wait for Railway client to be initialized
    await this.waitForRailwayClient();
    
    // Check if user is already logged in
    await this.checkAuthStatus();
    
    if (this.isLoggedIn) {
      await this.loadDashboard();
    } else {
      this.showLoginModal();
    }
  }

  // Wait for Railway client to be initialized
  async waitForRailwayClient() {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    console.log('🔍 Admin: Waiting for railwayClient...');
    
    while (!window.railwayClient && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (window.railwayClient) {
      this.client = window.railwayClient;
      console.log('✅ Admin: Connected to Railway client');
    } else {
      console.error('❌ Admin: Railway client not found');
      this.showNotification('Failed to connect to Railway API. Please refresh the page.', 'error');
    }
  }

  // Check authentication status
  async checkAuthStatus() {
    try {
      if (this.client && this.client.isAdminLoggedIn()) {
        const result = await this.client.verifyAdminToken();
        if (result.valid) {
          this.isLoggedIn = true;
          this.currentUser = result.admin;
          console.log('✅ Admin authenticated:', this.currentUser.name);
          return true;
        }
      }
    } catch (error) {
      console.log('🔑 Admin not authenticated');
      this.client.adminLogout(); // Clear invalid token
    }
    
    this.isLoggedIn = false;
    this.currentUser = null;
    return false;
  }

  // Show login modal
  showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
      loginModal.style.display = 'block';
    } else {
      // Create login modal if it doesn't exist
      this.createLoginModal();
    }
  }

  // Create login modal
  createLoginModal() {
    const modalHTML = `
      <div id="loginModal" class="modal" style="display: block;">
        <div class="modal-content">
          <h2>Admin Login</h2>
          <form id="loginForm">
            <div class="form-group">
              <label for="loginEmail">Email:</label>
              <input type="email" id="loginEmail" required value="admin@zentrohomes.com">
            </div>
            <div class="form-group">
              <label for="loginPassword">Password:</label>
              <input type="password" id="loginPassword" required>
            </div>
            <div class="form-group">
              <button type="submit" class="btn btn-primary">Login</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.bindAuthEvents();
  }

  // Bind authentication events
  bindAuthEvents() {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await this.handleLogout();
      });
    }
  }

  // Handle login
  async handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
      this.showNotification('Please enter email and password', 'error');
      return;
    }

    try {
      this.setLoading(true, 'Logging in...');
      
      const result = await this.client.adminLogin(email, password);
      
      if (result.token) {
        this.isLoggedIn = true;
        this.currentUser = result.admin;
        
        // Hide login modal
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
          loginModal.style.display = 'none';
        }
        
        // Load dashboard
        await this.loadDashboard();
        
        this.showNotification(`Welcome back, ${this.currentUser.name}!`, 'success');
      }
    } catch (error) {
      console.error('Login failed:', error);
      this.showNotification(error.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  // Handle logout
  async handleLogout() {
    try {
      await this.client.adminLogout();
      this.isLoggedIn = false;
      this.currentUser = null;
      
      // Clear data
      this.properties = [];
      this.filteredProperties = [];
      this.contactInquiries = [];
      
      // Show login modal
      this.showLoginModal();
      
      this.showNotification('Logged out successfully', 'info');
    } catch (error) {
      console.error('Logout error:', error);
      this.showNotification('Logout completed', 'info');
    }
  }

  // Load dashboard data
  async loadDashboard() {
    try {
      this.setLoading(true, 'Loading dashboard...');
      
      // Load properties and contacts in parallel
      await Promise.all([
        this.loadPropertiesFromAPI(),
        this.loadContactInquiries(),
        this.updateDashboardStats()
      ]);
      
      this.renderProperties();
      this.renderContactInquiries();
      this.populateMediaPropertySelect();
      
    } catch (error) {
      console.error('Dashboard loading failed:', error);
      this.showNotification('Failed to load dashboard data', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  // Load properties from Railway API
  async loadPropertiesFromAPI() {
    try {
      console.log('🔄 Loading properties from Railway API...');
      
      const response = await this.client.getAdminProperties();
      
      if (response.properties) {
        this.properties = this.convertToLegacyFormat(response.properties);
        this.filteredProperties = [...this.properties];
        console.log(`✅ Loaded ${this.properties.length} properties`);
      }
      
    } catch (error) {
      console.error('❌ Failed to load properties:', error);
      this.showNotification('Failed to load properties from server', 'error');
      // Use fallback data
      if (window.apartmentsData) {
        this.properties = [...window.apartmentsData.apartments];
        this.filteredProperties = [...this.properties];
      }
    }
  }

  // Load contact inquiries
  async loadContactInquiries() {
    try {
      console.log('📧 Loading contact inquiries...');
      
      const response = await this.client.getContactInquiries();
      
      if (response.inquiries) {
        this.contactInquiries = response.inquiries;
        console.log(`✅ Loaded ${this.contactInquiries.length} inquiries`);
      }
      
    } catch (error) {
      console.error('❌ Failed to load contact inquiries:', error);
      this.contactInquiries = [];
    }
  }

  // Update dashboard statistics
  async updateDashboardStats() {
    try {
      const stats = await this.client.getDashboardStats();
      
      if (stats) {
        // Update properties stats
        this.updateStatElement('total-properties', stats.properties?.total_properties || 0);
        this.updateStatElement('for-sale', stats.properties?.for_sale_count || 0);
        this.updateStatElement('for-rent', stats.properties?.for_rent_count || 0);
        this.updateStatElement('featured-properties', stats.properties?.featured_count || 0);
        
        // Update contacts stats
        this.updateStatElement('total-inquiries', stats.contacts?.total_inquiries || 0);
        this.updateStatElement('new-inquiries', stats.contacts?.new_inquiries || 0);
        this.updateStatElement('urgent-inquiries', stats.contacts?.urgent_inquiries || 0);
        
        console.log('📊 Dashboard stats updated');
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }

  // Convert Railway API format to legacy format for compatibility
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
        country: property.location_country || 'Kenya'
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
      
      images: Array.isArray(property.images) ? property.images : 
              (typeof property.images === 'string' ? JSON.parse(property.images || '[]') : []),
      
      amenities: Array.isArray(property.amenities) ? property.amenities : 
                 (typeof property.amenities === 'string' ? JSON.parse(property.amenities || '[]') : []),
      
      // Status fields
      available: property.available,
      featured: property.featured,
      published: property.published,
      viewsCount: property.views_count || 0,
      
      // Timestamps
      dateAdded: property.created_at ? property.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      createdAt: property.created_at,
      updatedAt: property.updated_at
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
      
      bedrooms: apartment.features?.bedrooms || 0,
      bathrooms: apartment.features?.bathrooms || 0,
      parking: apartment.features?.parking || 0,
      size: apartment.features?.size || 0,
      size_unit: apartment.features?.sizeUnit || 'm²',
      
      year_built: apartment.details?.yearBuilt,
      furnished: apartment.details?.furnished !== false,
      description: apartment.description || apartment.details?.description || '',
      short_description: apartment.details?.shortDescription || apartment.shortDescription,
      
      images: apartment.images || [],
      amenities: apartment.amenities || [],
      
      available: apartment.available !== false,
      featured: apartment.featured === true,
      published: apartment.published !== false
    };
  }

  // Add property
  async addProperty(propertyData) {
    try {
      this.setLoading(true, 'Adding property...');
      
      const railwayData = this.convertFromLegacyFormat(propertyData);
      const response = await this.client.createProperty(railwayData);
      
      if (response.property) {
        // Add to local cache
        const newProperty = this.convertToLegacyFormat([response.property])[0];
        this.properties.unshift(newProperty);
        this.filteredProperties = [...this.properties];
        
        // Re-render
        this.renderProperties();
        await this.updateDashboardStats();
        
        this.showNotification('Property added successfully!', 'success');
        return newProperty;
      }
      
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Failed to add property:', error);
      this.showNotification(error.message || 'Failed to add property', 'error');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // Update property
  async updateProperty(id, propertyData) {
    try {
      this.setLoading(true, 'Updating property...');
      
      const railwayData = this.convertFromLegacyFormat(propertyData);
      const response = await this.client.updateProperty(id, railwayData);
      
      if (response.property) {
        // Update local cache
        const index = this.properties.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
          this.properties[index] = { ...this.properties[index], ...propertyData };
          this.filteredProperties = [...this.properties];
          
          // Re-render
          this.renderProperties();
          await this.updateDashboardStats();
          
          this.showNotification('Property updated successfully!', 'success');
          return this.properties[index];
        }
      }
      
      throw new Error('Property not found');
    } catch (error) {
      console.error('Failed to update property:', error);
      this.showNotification(error.message || 'Failed to update property', 'error');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // Delete property
  async deleteProperty(id) {
    try {
      this.setLoading(true, 'Deleting property...');
      
      await this.client.deleteProperty(id);
      
      // Remove from local cache
      this.properties = this.properties.filter(p => p.id !== parseInt(id));
      this.filteredProperties = [...this.properties];
      
      // Re-render
      this.renderProperties();
      await this.updateDashboardStats();
      
      this.showNotification('Property deleted successfully!', 'success');
      return true;
    } catch (error) {
      console.error('Failed to delete property:', error);
      this.showNotification(error.message || 'Failed to delete property', 'error');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // Update contact inquiry status
  async updateContactStatus(id, updateData) {
    try {
      const response = await this.client.updateContactInquiry(id, updateData);
      
      if (response.inquiry) {
        // Update local cache
        const index = this.contactInquiries.findIndex(c => c.id === parseInt(id));
        if (index !== -1) {
          this.contactInquiries[index] = { ...this.contactInquiries[index], ...updateData };
          this.renderContactInquiries();
        }
        
        this.showNotification('Contact inquiry updated successfully!', 'success');
        return true;
      }
    } catch (error) {
      console.error('Failed to update contact inquiry:', error);
      this.showNotification(error.message || 'Failed to update inquiry', 'error');
      return false;
    }
  }

  // Render contact inquiries
  renderContactInquiries() {
    const container = document.getElementById('contactInquiriesList');
    if (!container) return;

    if (this.contactInquiries.length === 0) {
      container.innerHTML = '<p>No contact inquiries found.</p>';
      return;
    }

    const inquiriesHTML = this.contactInquiries.map(inquiry => `
      <div class="inquiry-card" data-id="${inquiry.id}">
        <div class="inquiry-header">
          <h4>${inquiry.name}</h4>
          <span class="status-badge status-${inquiry.status}">${inquiry.status}</span>
          <span class="priority-badge priority-${inquiry.priority}">${inquiry.priority}</span>
        </div>
        <div class="inquiry-details">
          <p><strong>Email:</strong> ${inquiry.email}</p>
          ${inquiry.phone ? `<p><strong>Phone:</strong> ${inquiry.phone}</p>` : ''}
          ${inquiry.property_title ? `<p><strong>Property:</strong> ${inquiry.property_title}</p>` : ''}
          <p><strong>Type:</strong> ${inquiry.inquiry_type}</p>
          ${inquiry.subject ? `<p><strong>Subject:</strong> ${inquiry.subject}</p>` : ''}
          <p><strong>Message:</strong> ${inquiry.message}</p>
          <p><strong>Date:</strong> ${new Date(inquiry.created_at).toLocaleDateString()}</p>
        </div>
        <div class="inquiry-actions">
          <select onchange="admin.updateContactStatus(${inquiry.id}, { status: this.value })">
            <option value="new" ${inquiry.status === 'new' ? 'selected' : ''}>New</option>
            <option value="in_progress" ${inquiry.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="contacted" ${inquiry.status === 'contacted' ? 'selected' : ''}>Contacted</option>
            <option value="resolved" ${inquiry.status === 'resolved' ? 'selected' : ''}>Resolved</option>
            <option value="closed" ${inquiry.status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
          <select onchange="admin.updateContactStatus(${inquiry.id}, { priority: this.value })">
            <option value="low" ${inquiry.priority === 'low' ? 'selected' : ''}>Low</option>
            <option value="normal" ${inquiry.priority === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="high" ${inquiry.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="urgent" ${inquiry.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
          </select>
        </div>
      </div>
    `).join('');

    container.innerHTML = inquiriesHTML;
  }

  // Update stat element
  updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
    }
  }

  // Set loading state
  setLoading(loading, message = 'Loading...') {
    this.isLoading = loading;
    const loadingEl = document.getElementById('loadingIndicator');
    
    if (loading) {
      if (loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.textContent = message;
      }
    } else {
      if (loadingEl) {
        loadingEl.style.display = 'none';
      }
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.className = 'notification';
      document.body.appendChild(notification);
    }
    
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.style.display = 'none';
    }, 5000);
  }

  // Navigation, property events, media events, and modal events would be implemented here
  // These would be similar to the original Supabase version but calling the Railway API methods
  
  bindNavigation() {
    // Navigation binding implementation
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.admin-section');
    
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('data-section');
        
        // Update active nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Show target section
        sections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(target);
        if (targetSection) {
          targetSection.classList.add('active');
        }
      });
    });
  }

  bindPropertyEvents() {
    // Property events binding implementation
    // This would handle add, edit, delete property buttons
  }

  bindMediaEvents() {
    // Media events binding implementation
    // This would handle file uploads and media management
  }

  bindModalEvents() {
    // Modal events binding implementation
    // This would handle modal open/close events
  }

  renderProperties() {
    // Properties rendering implementation
    const container = document.getElementById('propertiesList');
    if (!container) return;

    if (this.filteredProperties.length === 0) {
      container.innerHTML = '<p>No properties found.</p>';
      return;
    }

    const propertiesHTML = this.filteredProperties.map(property => `
      <div class="property-card" data-id="${property.id}">
        <div class="property-image">
          ${property.images && property.images.length > 0 
            ? `<img src="${property.images[0].url || property.images[0]}" alt="${property.title}" loading="lazy">`
            : '<div class="no-image">No Image</div>'}
        </div>
        <div class="property-details">
          <h3>${property.title}</h3>
          <p><strong>Type:</strong> ${property.type}</p>
          <p><strong>Status:</strong> ${property.status}</p>
          <p><strong>Price:</strong> ${this.formatPrice(property.price)}</p>
          <p><strong>Location:</strong> ${property.location.area}, ${property.location.city}</p>
          <p><strong>Bedrooms:</strong> ${property.features.bedrooms} | <strong>Bathrooms:</strong> ${property.features.bathrooms}</p>
          <div class="property-actions">
            <button onclick="admin.editProperty(${property.id})" class="btn btn-edit">Edit</button>
            <button onclick="admin.deletePropertyConfirm(${property.id})" class="btn btn-delete">Delete</button>
            <span class="status-badges">
              ${property.featured ? '<span class="badge featured">Featured</span>' : ''}
              ${property.published ? '<span class="badge published">Published</span>' : '<span class="badge unpublished">Draft</span>'}
            </span>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = propertiesHTML;
  }

  formatPrice(price) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  populateMediaPropertySelect() {
    // Populate property selection dropdown for media management
    const select = document.getElementById('mediaPropertySelect');
    if (!select) return;

    const options = this.properties.map(property => 
      `<option value="${property.id}">${property.title}</option>`
    ).join('');
    
    select.innerHTML = '<option value="">Select Property</option>' + options;
  }

  // Additional methods would be implemented here...
}

// Initialize admin when DOM is loaded
let admin;

document.addEventListener('DOMContentLoaded', async function() {
  admin = new ZentroAdminRailway();
  
  // Make it globally available
  window.admin = admin;
  
  console.log('🚀 Railway Admin initialized');
});

// Export for compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZentroAdminRailway;
}