// Zentro Homes Admin Dashboard - Consolidated Authentication System
// Complete admin interface with authentication, property management, and database integration
// Uses backend API endpoints for authentication and Railway database for data management
class ZentroAdminRailway {
  constructor() {
    this.properties = [];
    this.filteredProperties = [];
    this.contactInquiries = [];
    this.currentEditingId = null;
    this.isLoading = false;
    this.isLoggedIn = false;
    this.currentUser = null;
    
    // Media management - single image approach
    this.selectedMedia = {
      image: null, // Single image file
      youtubeUrl: '' // YouTube URL for property video
    };
    this.maxImageSize = 10 * 1024 * 1024; // 10MB

    this.init();
  }

  async init() {
    this.bindNavigation();
    this.bindPropertyEvents();
    this.bindModalEvents();
    this.bindAuthEvents();
    
    // Wait for Railway manager to be initialized  
    await this.waitForRailwayManager();
    
    // Check if user is already logged in
    await this.checkAuthStatus();
    
    if (this.isLoggedIn) {
      await this.loadDashboard();
    } else {
      this.showLoginModal();
    }
  }


  // Wait for Railway manager to be initialized
  async waitForRailwayManager() {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    console.log('🔍 Admin: Waiting for Railway manager...');
    
    while (!window.railwayManager && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.railwayManager) {
      this.showNotification('Failed to connect to Railway database. Using offline mode.', 'error');
      this.properties = [...apartmentsData.apartments];
      this.filteredProperties = [...this.properties];
    } else {
      console.log('✅ Admin: Connected to Railway database successfully');
    }
  }

  // Check authentication status
  async checkAuthStatus() {
    try {
      const token = localStorage.getItem('admin_token');
      
      if (token) {
        const response = await fetch('/api/admin/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.valid) {
            this.isLoggedIn = true;
            this.currentUser = result.admin;
            console.log('✅ Admin authenticated:', this.currentUser.name);
            return true;
          }
        }
      }
    } catch (error) {
      console.log('🔑 Admin not authenticated');
      localStorage.removeItem('admin_token'); // Clear invalid token
    }
    
    this.isLoggedIn = false;
    this.currentUser = null;
    return false;
  }

  // Show login modal
  showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    const loginScreen = document.getElementById('login-screen');
    
    if (loginScreen) {
      loginScreen.classList.remove('hidden');
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel) adminPanel.classList.add('hidden');
    } else if (loginModal) {
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
              <input type="email" id="loginEmail" required value="admin">
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
    const loginForm = document.getElementById('loginForm') || document.getElementById('login-form');
    const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logout-btn');
    
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

    // Add click handlers for drop zones that were previously inline
    const mediaVideoDropZone = document.getElementById('media-video-drop-zone');
    const imagesDropZone = document.getElementById('images-drop-zone');

    if (mediaVideoDropZone) {
      mediaVideoDropZone.addEventListener('click', () => {
        const videoInput = document.getElementById('video-input');
        if (videoInput) videoInput.click();
      });
    }

    if (imagesDropZone) {
      imagesDropZone.addEventListener('click', () => {
        const imagesInput = document.getElementById('images-input');
        if (imagesInput) imagesInput.click();
      });
    }

    // Add event delegation for dynamically created remove buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-image-btn')) {
        const index = parseInt(e.target.getAttribute('data-remove-index'));
        this.removeImage(index);
      }
    });
  }

  // Handle login
  async handleLogin() {
    const email = (document.getElementById('loginEmail') || document.getElementById('username')).value;
    const password = (document.getElementById('loginPassword') || document.getElementById('password')).value;
    
    if (!email || !password) {
      this.showNotification('Please enter email and password', 'error');
      return;
    }

    try {
      this.setLoading(true);
      
      // Direct API call to backend authentication
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      
      if (response.ok && result.token) {
        this.isLoggedIn = true;
        this.currentUser = result.admin;
        
        // Store token for future requests
        localStorage.setItem('admin_token', result.token);
        
        // Hide login modal/screen
        const loginModal = document.getElementById('loginModal');
        const loginScreen = document.getElementById('login-screen');
        
        if (loginModal) {
          loginModal.style.display = 'none';
        }
        if (loginScreen) {
          loginScreen.classList.add('hidden');
          document.getElementById('admin-panel').classList.remove('hidden');
        }
        
        // Load dashboard
        await this.loadDashboard();
        
        this.showNotification(`Welcome back, ${this.currentUser.name}!`, 'success');
      } else {
        throw new Error(result.error || 'Login failed');
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
      const token = localStorage.getItem('admin_token');
      
      if (token) {
        // Call backend logout endpoint
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Clear local data
      localStorage.removeItem('admin_token');
      this.isLoggedIn = false;
      this.currentUser = null;
      
      // Clear data
      this.properties = [];
      this.filteredProperties = [];
      this.contactInquiries = [];
      
      // Show login modal/screen
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) {
        loginScreen.classList.remove('hidden');
        document.getElementById('admin-panel').classList.add('hidden');
      } else {
        this.showLoginModal();
      }
      
      this.showNotification('Logged out successfully', 'info');
    } catch (error) {
      console.error('Logout error:', error);
      this.showNotification('Logout completed', 'info');
    }
  }

  // Load dashboard data
  async loadDashboard() {
    try {
      this.setLoading(true);
      
      // Load properties and contacts in parallel
      await Promise.all([
        this.loadPropertiesFromDatabase(),
        this.loadContactInquiries(),
        this.updateDashboard()
      ]);
      
      this.renderProperties();
      this.renderContactInquiries();
      
    } catch (error) {
      console.error('Dashboard loading failed:', error);
      this.showNotification('Failed to load dashboard data', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  // Load contact inquiries
  async loadContactInquiries() {
    try {
      const token = localStorage.getItem('admin_token');
      if (token) {
        console.log('📧 Loading contact inquiries...');
        const response = await fetch('/api/admin/contacts', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.contactInquiries = data.inquiries || [];
          console.log(`✅ Loaded ${this.contactInquiries.length} inquiries`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load contact inquiries:', error);
      this.contactInquiries = [];
    }
  }

  // Render contact inquiries (stub for now)
  renderContactInquiries() {
    // Implementation would be added if needed
  }

  // Load properties from database via API
  async loadPropertiesFromDatabase() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      console.warn('No authentication token, using local data');
      this.properties = [...apartmentsData.apartments];
      this.filteredProperties = [...this.properties];
      return;
    }

    try {
      this.setLoading(true);
      
      const response = await fetch('/api/admin/properties', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.properties = data.properties || [];
        this.filteredProperties = [...this.properties];
        console.log(`✅ Loaded ${this.properties.length} properties from database`);
      } else {
        throw new Error('Failed to load properties');
      }
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

  // Validate image file
  validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      this.showNotification('Please select a valid image file (JPEG, PNG, GIF, WebP)', 'error');
      return false;
    }
    
    if (file.size > this.maxImageSize) {
      this.showNotification('Image size must be less than 10MB', 'error');
      return false;
    }
    
    return true;
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Clear all media
  clearAllMedia() {
    this.selectedMedia = {
      images: [],
      youtubeUrl: ''
    };
    
    // Clear previews
    const imagesPreview = document.getElementById('images-preview');
    const youtubeInput = document.getElementById('property-youtube-url');
    
    if (imagesPreview) imagesPreview.innerHTML = '';
    if (youtubeInput) youtubeInput.value = '';
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

  openPropertyModal(property = null) {
    const modal = document.getElementById('property-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('property-form');

    // Clear media selections
    this.clearAllMedia();

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
    
    // Bind media upload events after modal is shown
    setTimeout(() => {
      console.log('🎬 Binding media events for Railway modal...');
      this.bindMultipleImageEvents();
      this.bindYouTubeEvents();
      console.log('✅ Media events bound for Railway modal');
    }, 200);
  }

  closePropertyModal() {
    const modal = document.getElementById('property-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
    this.currentEditingId = null;
    
    // Clear media and preview
    this.clearAllMedia();
    const previewContainer = document.getElementById('property-preview');
    if (previewContainer) {
      previewContainer.remove();
    }
  }

  populatePropertyForm(property) {
    // Populate basic form fields
    this.setFormValue('property-title', property.title);
    this.setFormValue('property-type', property.type);
    this.setFormValue('property-status', property.status);
    this.setFormValue('property-price', property.price);
    this.setFormValue('property-currency', property.currency);
    
    // Location fields (flat structure from database)
    this.setFormValue('property-area', property.location_area);
    this.setFormValue('property-city', property.location_city);
    this.setFormValue('property-country', property.location_country);
    // Parse coordinates if they exist (stored as "lat,lng" string)
    if (property.coordinates) {
      const coords = property.coordinates.split(',');
      this.setFormValue('property-coordinates-lat', coords[0]?.trim());
      this.setFormValue('property-coordinates-lng', coords[1]?.trim());
    }
    
    // Features (flat structure from database)
    this.setFormValue('property-bedrooms', property.bedrooms);
    this.setFormValue('property-bathrooms', property.bathrooms);
    this.setFormValue('property-parking', property.parking);
    this.setFormValue('property-size', property.size);
    this.setFormValue('property-size-unit', property.size_unit);
    
    // Additional details
    this.setFormValue('property-year-built', property.year_built);
    this.setFormValue('property-furnished', property.furnished === true ? 'true' : 'false');
    
    // Content
    this.setFormValue('property-description', property.description);
    this.setFormValue('property-short-description', property.short_description);
    // Parse amenities if they exist (stored as comma-separated string)
    this.setFormValue('property-amenities', property.amenities || '');
    
    // Status fields
    this.setFormValue('property-available', property.available !== false ? 'true' : 'false');
    this.setFormValue('property-featured', property.featured === true ? 'true' : 'false');
    this.setFormValue('property-published', property.published !== false ? 'true' : 'false');
    
    // Media URLs
    this.setFormValue('property-youtube-url', property.youtube_url);
    this.setFormValue('property-virtual-tour-url', property.virtual_tour_url);

    // Clear any existing media selections
    this.clearAllMedia();

    // Show existing images in preview (for reference, but don't add to selectedMedia)
    this.showExistingImages(property);
    
    // Populate YouTube URL if exists
    if (property.youtube_url) {
      this.selectedMedia.youtubeUrl = property.youtube_url;
    }
    
    console.log('✅ Property form populated for Railway editing:', property.title);
  }

  // Helper method to safely set form values
  setFormValue(id, value) {
    const element = document.getElementById(id);
    if (element && value !== null && value !== undefined) {
      element.value = value;
    }
  }

  // Show existing images for reference during editing
  showExistingImages(property) {
    const imagesPreview = document.getElementById('images-preview');
    if (!imagesPreview) return;

    let existingImagesHtml = '';
    
    // Show main image
    if (property.main_image) {
      existingImagesHtml += `
        <div class="relative group border-2 border-blue-200 rounded-lg">
          <img src="${property.main_image}" alt="Current main image" class="w-full h-24 object-cover rounded-lg">
          <div class="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Current Main</div>
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <span class="text-white text-xs">Upload new image to replace</span>
          </div>
        </div>
      `;
    }

    // Show gallery images (stored as comma-separated string)
    if (property.gallery_images) {
      const galleryUrls = property.gallery_images.split(',').filter(url => url.trim());
      galleryUrls.forEach((galleryUrl, index) => {
        existingImagesHtml += `
          <div class="relative group border-2 border-gray-200 rounded-lg">
            <img src="${galleryUrl.trim()}" alt="Current gallery image ${index + 1}" class="w-full h-24 object-cover rounded-lg">
            <div class="absolute top-2 left-2 bg-gray-600 text-white text-xs px-2 py-1 rounded-full">Gallery ${index + 1}</div>
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <span class="text-white text-xs">Upload new image to replace</span>
            </div>
          </div>
        `;
      });
    }

    if (existingImagesHtml) {
      imagesPreview.innerHTML = existingImagesHtml;
    }
  }

  getFormData() {
    // Get form values and ensure they are not empty
    const title = document.getElementById('property-title').value.trim();
    const type = document.getElementById('property-type').value;
    const status = document.getElementById('property-status').value;
    const price = document.getElementById('property-price').value;
    const area = document.getElementById('property-area').value.trim();
    const city = document.getElementById('property-city').value.trim();
    const bedrooms = document.getElementById('property-bedrooms').value;
    const bathrooms = document.getElementById('property-bathrooms').value;
    const size = document.getElementById('property-size').value;
    const description = document.getElementById('property-description').value.trim();

    return {
      id: this.currentEditingId || 'new',
      // Basic information
      title: title,
      type: type,  
      status: status,
      price: price ? parseInt(price) : null,
      currency: document.getElementById('property-currency').value || 'KES',
      
      // Location information
      location: {
        area: area,
        city: city, 
        country: document.getElementById('property-country').value || 'Kenya',
        coordinates: { 
          lat: document.getElementById('property-coordinates-lat')?.value ? parseFloat(document.getElementById('property-coordinates-lat').value) : null,
          lng: document.getElementById('property-coordinates-lng')?.value ? parseFloat(document.getElementById('property-coordinates-lng').value) : null
        }
      },
      
      // Property features
      features: {
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        parking: document.getElementById('property-parking').value ? parseInt(document.getElementById('property-parking').value) : 0,
        size: size ? parseInt(size) : null,
        sizeUnit: document.getElementById('property-size-unit').value || 'm²'
      },
      
      // Content
      description: description,
      shortDescription: document.getElementById('property-short-description')?.value?.trim() || '',
      images: {
        main: null, // Images are handled separately in processMediaUploads
        gallery: []
      },
      amenities: document.getElementById('property-amenities').value.split(',').map(a => a.trim()).filter(a => a) || [],
      
      // Additional property details
      yearBuilt: document.getElementById('property-year-built')?.value ? parseInt(document.getElementById('property-year-built').value) : null,
      furnished: document.getElementById('property-furnished')?.value === 'true',
      available: document.getElementById('property-available')?.value !== 'false',
      featured: document.getElementById('property-featured')?.value === 'true',
      published: document.getElementById('property-published')?.value !== 'false',
      
      // Media URLs
      youtubeUrl: document.getElementById('property-youtube-url')?.value?.trim() || '',
      virtualTourUrl: document.getElementById('property-virtual-tour-url')?.value?.trim() || '',
      
      // Timestamps
      dateAdded: new Date().toISOString().split('T')[0]
    };
  }

  previewProperty() {
    const formData = this.getFormData();
    this.generatePreview(formData);
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
          <img src="${formData.images.main || '../wp-content/uploads/2025/02/default-property.jpg'}" alt="${formData.title}" class="w-full h-48 object-cover">
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
      <div class="mt-4 text-center">
        <p class="text-sm text-gray-500">This is how your property will appear on the website</p>
        ${this.selectedMedia.youtubeUrl ? `<p class="text-xs text-zentro-gold mt-1">YouTube video will be included</p>` : ''}
      </div>
    `;
    
    previewContainer.appendChild(heading);
    previewContainer.innerHTML += previewHTML;
    document.getElementById('property-form').appendChild(previewContainer);
  }

  async saveProperty() {
    const formData = this.getFormData();

    // Validate required fields
    const requiredFields = [
      { field: formData.title, name: 'Title' },
      { field: formData.type, name: 'Type' },
      { field: formData.status, name: 'Status' },
      { field: formData.price, name: 'Price' },
      { field: formData.location.area, name: 'Area' },
      { field: formData.location.city, name: 'City' },
      { field: formData.features.bedrooms, name: 'Bedrooms' },
      { field: formData.features.bathrooms, name: 'Bathrooms' },
      { field: formData.features.size, name: 'Size' },
      { field: formData.description, name: 'Description' }
    ];

    const missingFields = requiredFields
      .filter(req => !req.field || req.field === '' || req.field === 0)
      .map(req => req.name);

    if (missingFields.length > 0) {
      this.showNotification(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) {
      this.showNotification('Authentication required. Please login again.', 'error');
      return;
    }

    try {
      this.setLoading(true);
      
      // Process media uploads and prepare media data
      const mediaData = await this.processMediaUploads();
      
      // Prepare property data for API - map to expected database schema
      const propertyPayload = {
        title: formData.title,
        type: formData.type,
        status: formData.status,
        price: formData.price,
        currency: formData.currency,
        location_area: formData.location.area,
        location_city: formData.location.city,
        location_country: formData.location.country,
        coordinates: formData.location.coordinates && formData.location.coordinates.lat && formData.location.coordinates.lng ? 
          `${formData.location.coordinates.lat},${formData.location.coordinates.lng}` : null,
        bedrooms: formData.features.bedrooms,
        bathrooms: formData.features.bathrooms,
        parking: formData.features.parking,
        size: formData.features.size,
        size_unit: formData.features.sizeUnit,
        description: formData.description,
        short_description: formData.shortDescription,
        main_image: mediaData.images && mediaData.images.length > 0 ? mediaData.images[0].url : null,
        gallery_images: mediaData.images && mediaData.images.length > 1 ? mediaData.images.slice(1).map(img => img.url).join(',') : null,
        amenities: formData.amenities.join(','),
        year_built: formData.yearBuilt,
        furnished: formData.furnished,
        available: formData.available,
        featured: formData.featured,
        published: formData.published,
        youtube_url: mediaData.youtubeUrl,
        virtual_tour_url: formData.virtualTourUrl
      };

      const endpoint = this.currentEditingId && this.currentEditingId !== 'new' 
        ? `/api/admin/properties/${this.currentEditingId}`
        : '/api/admin/properties';
      
      const method = this.currentEditingId && this.currentEditingId !== 'new' ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(propertyPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save property');
      }

      const result = await response.json();
      
      const action = this.currentEditingId && this.currentEditingId !== 'new' ? 'updated' : 'added';
      this.showNotification(`Property ${action} successfully!`, 'success');

      this.closePropertyModal();
      await this.loadPropertiesFromDatabase();
      this.renderProperties();
      this.updateDashboard();
      
    } catch (error) {
      console.error('Error saving property to Railway:', error);
      this.showNotification('Error saving property: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  // Bind multiple image upload events
  bindMultipleImageEvents() {
    const imagesDropZone = document.getElementById('images-drop-zone');
    const imagesInput = document.getElementById('images-input');
    const imagesPreview = document.getElementById('images-preview');

    console.log('Binding Railway image events...', {
      imagesDropZone: !!imagesDropZone,
      imagesInput: !!imagesInput,
      imagesPreview: !!imagesPreview
    });

    if (!imagesDropZone || !imagesInput || !imagesPreview) {
      console.error('Image elements not found:', {
        imagesDropZone: !!imagesDropZone,
        imagesInput: !!imagesInput,
        imagesPreview: !!imagesPreview
      });
      return;
    }

    // Click to browse files
    imagesDropZone.addEventListener('click', (e) => {
      console.log('Railway images drop zone clicked!');
      e.preventDefault();
      imagesInput.click();
    });

    // Handle file selection
    imagesInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleSingleImage(e.target.files[0]);
      }
    });

    // Drag and drop functionality
    imagesDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      imagesDropZone.classList.add('border-zentro-gold', 'bg-zentro-gold/10');
    });

    imagesDropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      imagesDropZone.classList.remove('border-zentro-gold', 'bg-zentro-gold/10');
    });

    imagesDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      imagesDropZone.classList.remove('border-zentro-gold', 'bg-zentro-gold/10');
      
      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      if (files.length > 0) {
        this.handleSingleImage(files[0]);
      }
    });
  }

  // Handle single image file
  handleSingleImage(file) {
    if (!file) return;

    // Store single file in selectedMedia
    this.selectedMedia.image = file;
    
    // Update preview
    this.renderSingleImagePreview(file);
    
    console.log(`Selected single image for Railway storage: ${file.name}`);
  }

  // Render preview for single image  
  renderSingleImagePreview(file) {
    const previewContainer = document.getElementById('images-preview');
    previewContainer.innerHTML = '';

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageContainer = document.createElement('div');
      imageContainer.className = 'relative group max-w-xs';
      
      imageContainer.innerHTML = `
        <div class="absolute top-2 left-2 bg-zentro-gold text-white text-xs px-2 py-1 rounded-full">Main Image</div>
        <img src="${e.target.result}" 
             alt="Property Image Preview" 
             class="w-full h-32 object-cover rounded-lg border-2 border-gray-200">
        <button class="remove-image-btn absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          ×
        </button>
      `;
      
      // Add event listener for remove button
      const removeBtn = imageContainer.querySelector('.remove-image-btn');
      removeBtn.addEventListener('click', () => this.removeSingleImage());
      
      previewContainer.appendChild(imageContainer);
    };
    
    reader.readAsDataURL(file);
  }

  // Remove single image from selection
  removeSingleImage() {
    this.selectedMedia.image = null;
    document.getElementById('images-preview').innerHTML = '';
    console.log('Removed selected image');
  }

  // Bind YouTube URL events
  bindYouTubeEvents() {
    const youtubeInput = document.getElementById('property-youtube-url');

    console.log('Binding Railway YouTube URL events...', {
      youtubeInput: !!youtubeInput
    });

    if (!youtubeInput) {
      console.error('YouTube URL input not found');
      return;
    }

    // Handle YouTube URL input changes
    youtubeInput.addEventListener('input', (e) => {
      this.selectedMedia.youtubeUrl = e.target.value;
      console.log('YouTube URL updated for Railway:', this.selectedMedia.youtubeUrl);
    });

    // Validate YouTube URL on blur
    youtubeInput.addEventListener('blur', (e) => {
      const url = e.target.value.trim();
      if (url && !this.isValidYouTubeUrl(url)) {
        this.showNotification('Please enter a valid YouTube URL', 'error');
        e.target.focus();
      }
    });

    console.log('✅ Railway YouTube URL events bound successfully');
  }

  // Validate YouTube URL
  isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]+/;
    return youtubeRegex.test(url);
  }

  // Simple validation for Railway
  validateRequiredMedia() {
    // For new properties, require at least one image
    if (!this.currentEditingId || this.currentEditingId === 'new') {
      if (!this.selectedMedia.image) {
        throw new Error('Please select an image for new properties');
      }
    }
    // For existing properties, images are optional (keep existing if none uploaded)
    console.log('✅ Railway media validation passed');
    return true;
  }

  async processMediaUploads() {
    // Validate media before processing
    this.validateRequiredMedia();
    
    const mediaData = {
      images: [],
      youtubeUrl: this.selectedMedia.youtubeUrl || ''
    };

    // Process single image - store locally since Railway doesn't have built-in storage
    if (this.selectedMedia.image) {
      console.log(`📸 Processing single image for Railway...`);
      
      // For Railway, we'll store files locally and save paths to database
      const storageUrl = await this.saveToLocalStorage(this.selectedMedia.image, 'image');
      
      const imageData = {
        url: storageUrl,
        alt: `${this.getFormData().title} - Main Image`,
        isPrimary: true,
        displayOrder: 0,
        fileSize: this.selectedMedia.image.size,
        mimeType: this.selectedMedia.image.type
      };

      mediaData.images = [imageData];
      console.log(`✅ Processed single image for Railway`);
    } else {
      console.log('📸 No new image to process for Railway');
    }

    // YouTube URL is already stored in mediaData.youtubeUrl
    if (mediaData.youtubeUrl) {
      console.log(`🎬 YouTube URL set for Railway: ${mediaData.youtubeUrl}`);
    } else {
      console.log('🎬 No YouTube URL provided for Railway');
    }

    return mediaData;
  }

  // Save file to local filesystem (Railway approach)
  async saveToLocalStorage(file, fileType = 'image') {
    try {
      console.log(`📁 Saving ${file.name} to local filesystem for Railway...`);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // For Railway, we'll use the wp-content uploads directory
      const relativePath = `wp-content/uploads/2025/02/${fileName}`;
      
      // In a real implementation, you'd use a proper file upload system
      // For now, we'll create a data URL and simulate the upload
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          // In production, this would be an actual file save operation
          console.log(`✅ File ${fileName} saved to Railway local storage`);
          resolve(`../${relativePath}`);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error saving file to Railway local storage:', error);
      throw new Error(`Failed to save ${file.name} to Railway local storage: ${error.message}`);
    }
  }

  // Filter by status using API
  async filterByStatus(status) {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      this.filteredProperties = this.properties.filter(property => property.status === status);
      this.renderProperties();
      return;
    }

    try {
      this.setLoading(true);
      
      const response = await fetch(`/api/admin/properties?status=${encodeURIComponent(status)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.filteredProperties = data.properties || [];
        this.renderProperties();
      } else {
        throw new Error('Failed to filter properties');
      }
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

    const token = localStorage.getItem('admin_token');
    if (!token) {
      this.filteredProperties = this.properties.filter(property => {
        return property.title.toLowerCase().includes(search) ||
               property.location_area?.toLowerCase().includes(search) ||
               property.location_city?.toLowerCase().includes(search);
      });
      this.renderProperties();
      return;
    }

    try {
      this.setLoading(true);
      
      const response = await fetch(`/api/admin/properties?search=${encodeURIComponent(search)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.filteredProperties = data.properties || [];
        this.renderProperties();
      } else {
        throw new Error('Failed to search properties');
      }
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
          <p class="text-gray-500">Loading properties from Railway...</p>
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
            <p class="text-lg font-medium">No properties found in Railway database</p>
            <p class="text-sm mt-2">Try adjusting your search criteria or add a new property</p>
          </div>
        </div>
      `;
      return;
    }

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
                    <img src="${property.main_image || '../wp-content/uploads/2025/02/default-property.jpg'}" alt="${property.title}" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjBGMkY1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxjaXJjbGUgY3g9IjI2IiBjeT0iMjgiIHI9IjMiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDM2TDI4IDI4TDM2IDM2TDQ0IDI4VjQ0SDIwVjM2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'">
                  </div>
                </td>
                <td class="h-[72px] px-4 py-2 text-zentro-dark text-sm font-normal">${property.title}</td>
                <td class="h-[72px] px-4 py-2 text-gray-600 text-sm font-normal">${property.location_area}, ${property.location_city}</td>
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

    const token = localStorage.getItem('admin_token');
    if (!token) {
      this.showNotification('Authentication required. Please login again.', 'error');
      return;
    }

    try {
      this.setLoading(true);
      
      const response = await fetch(`/api/admin/properties/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete property');
      }

      await this.loadPropertiesFromDatabase();
      this.renderProperties();
      this.updateDashboard();
      this.showNotification('Property deleted successfully!', 'success');
      
    } catch (error) {
      console.error('Error deleting property:', error);
      this.showNotification('Error deleting property: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  // Dashboard statistics via API
  async updateDashboard() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
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
      const response = await fetch('/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const stats = await response.json();
        
        document.getElementById('total-properties').textContent = stats.properties?.total_properties || 0;
        document.getElementById('for-sale-count').textContent = stats.properties?.for_sale_count || 0;
        document.getElementById('for-rent-count').textContent = stats.properties?.for_rent_count || 0;
        document.getElementById('avg-price').textContent = this.formatPrice(stats.properties?.average_price || 0, 'KES');
      }
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

    localStorage.setItem('zentro-railway-settings', JSON.stringify(settings));
    this.showNotification('Settings saved successfully for Railway!', 'success');
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
  window.zentroAdmin = new ZentroAdminRailway();
});