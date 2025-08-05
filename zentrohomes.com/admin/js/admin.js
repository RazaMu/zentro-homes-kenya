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
    
    // Media management - multiple images approach
    this.selectedMedia = {
      images: [], // Array of image files (first one is main image)
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
              <label for="loginEmail">Username:</label>
              <input type="text" id="loginEmail" required value="admin">
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

    if (mediaVideoDropZone) {
      mediaVideoDropZone.addEventListener('click', () => {
        const videoInput = document.getElementById('video-input');
        if (videoInput) videoInput.click();
      });
    }

    // Images drop zone click handling is now managed by bindMultipleImageEvents()

    // Add event delegation for dynamically created buttons
    document.addEventListener('click', (e) => {
      // Debug all clicks to see what's being clicked
      if (e.target.hasAttribute('data-action')) {
        console.log('🖱️ DEBUG: Button clicked with data-action:', e.target.getAttribute('data-action'));
        console.log('🖱️ DEBUG: Button element:', e.target);
        console.log('🖱️ DEBUG: Button classes:', e.target.className);
        console.log('🖱️ DEBUG: Property ID:', e.target.getAttribute('data-property-id'));
      }
      
      if (e.target.classList.contains('remove-image-btn')) {
        const index = parseInt(e.target.getAttribute('data-remove-index'));
        this.removeImageAtIndex(index);
      }
      
      // Handle property action buttons (edit/delete)
      if (e.target.hasAttribute('data-action') && e.target.hasAttribute('data-property-id')) {
        const action = e.target.getAttribute('data-action');
        const propertyId = parseInt(e.target.getAttribute('data-property-id'));
        
        console.log(`🎯 DEBUG: Action button clicked - Action: ${action}, Property ID: ${propertyId}`);
        
        if (action === 'edit') {
          console.log('✏️ DEBUG: Calling editProperty for ID:', propertyId);
          this.editProperty(propertyId);
        } else if (action === 'delete') {
          console.log('🗑️ DEBUG: Calling deleteProperty for ID:', propertyId);
          this.deleteProperty(propertyId);
        }
      }
    });
  }

  // Handle login
  async handleLogin() {
    const username = (document.getElementById('loginEmail') || document.getElementById('username')).value;
    const password = (document.getElementById('loginPassword') || document.getElementById('password')).value;
    
    if (!username || !password) {
      this.showNotification('Please enter username and password', 'error');
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
        body: JSON.stringify({ username, password })
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
    console.log('🎬 DEBUG: Opening property modal for:', property ? `editing "${property.title}"` : 'new property');
    
    const modal = document.getElementById('property-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('property-form');

    if (!modal || !modalTitle || !form) {
      console.error('❌ DEBUG: Modal elements not found:', {
        modal: !!modal,
        modalTitle: !!modalTitle,
        form: !!form
      });
      this.showNotification('Error: Modal elements not found', 'error');
      return;
    }

    // Clear media selections
    this.clearAllMedia();

    // Show modal first
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    
    console.log('🎬 DEBUG: Modal is now visible');

    if (property) {
      modalTitle.textContent = 'Edit Property';
      this.currentEditingId = property.id;
      
      // Wait for modal to be fully rendered before populating
      setTimeout(() => {
        console.log('🎯 DEBUG: Starting form population after modal render...');
        this.populatePropertyForm(property);
      }, 50);
    } else {
      modalTitle.textContent = 'Add Property';
      this.currentEditingId = null;
      form.reset();
      console.log('📝 DEBUG: Form reset for new property');
    }
    
    // Bind media upload events after modal is shown
    setTimeout(() => {
      console.log('🎬 DEBUG: Binding media events for Railway modal...');
      this.bindMultipleImageEvents();
      this.bindYouTubeEvents();
      console.log('✅ DEBUG: Media events bound for Railway modal');
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
    console.log('🎯 DEBUG: Starting form population for property:', property.title);
    console.log('🎯 DEBUG: Full property data:', property);
    
    // Test if modal is open and form exists
    const modal = document.getElementById('property-modal');
    const form = document.getElementById('property-form');
    console.log('🎯 DEBUG: Modal visible:', !modal?.classList.contains('hidden'));
    console.log('🎯 DEBUG: Form exists:', !!form);
    
    // Populate basic form fields
    console.log('📝 DEBUG: Populating basic fields...');
    this.setFormValue('property-title', property.title);
    this.setFormValue('property-type', property.type);
    this.setFormValue('property-status', property.status);
    this.setFormValue('property-price', property.price);
    this.setFormValue('property-currency', property.currency || 'KES');
    
    // Location fields (flat structure from database)
    console.log('📍 DEBUG: Populating location fields...');
    this.setFormValue('property-area', property.location_area);
    this.setFormValue('property-city', property.location_city);
    this.setFormValue('property-country', property.location_country || 'Kenya');
    
    // Handle coordinates - check both formats
    console.log('🗺️ DEBUG: Processing coordinates...');
    if (property.coordinates_lat && property.coordinates_lng) {
      console.log('   - Using separate lat/lng fields:', property.coordinates_lat, property.coordinates_lng);
      this.setFormValue('property-coordinates-lat', property.coordinates_lat);
      this.setFormValue('property-coordinates-lng', property.coordinates_lng);
    } else if (property.coordinates) {
      console.log('   - Parsing coordinates string:', property.coordinates);
      const coords = property.coordinates.split(',');
      this.setFormValue('property-coordinates-lat', coords[0]?.trim());
      this.setFormValue('property-coordinates-lng', coords[1]?.trim());
    }
    
    // Features (flat structure from database)
    console.log('🏠 DEBUG: Populating feature fields...');
    this.setFormValue('property-bedrooms', property.bedrooms);
    this.setFormValue('property-bathrooms', property.bathrooms);
    this.setFormValue('property-parking', property.parking || 0);
    this.setFormValue('property-size', property.size);
    this.setFormValue('property-size-unit', property.size_unit || 'm²');
    
    // Additional details
    console.log('📋 DEBUG: Populating additional details...');
    this.setFormValue('property-year-built', property.year_built);
    this.setFormValue('property-furnished', property.furnished === true ? 'true' : 'false');
    
    // Content
    console.log('📄 DEBUG: Populating content fields...');
    this.setFormValue('property-description', property.description);
    this.setFormValue('property-short-description', property.short_description);
    
    // Handle amenities - check different formats
    console.log('🎯 DEBUG: Processing amenities...');
    let amenitiesValue = '';
    if (property.amenities) {
      if (typeof property.amenities === 'string') {
        amenitiesValue = property.amenities;
      } else if (Array.isArray(property.amenities)) {
        amenitiesValue = property.amenities.join(', ');
      } else {
        console.log('   - Amenities in unexpected format:', typeof property.amenities, property.amenities);
        amenitiesValue = JSON.stringify(property.amenities);
      }
    }
    console.log('   - Final amenities value:', amenitiesValue);
    this.setFormValue('property-amenities', amenitiesValue);
    
    // Status fields
    console.log('🎛️ DEBUG: Populating status fields...');
    this.setFormValue('property-available', property.available !== false ? 'true' : 'false');
    this.setFormValue('property-featured', property.featured === true ? 'true' : 'false');
    this.setFormValue('property-published', property.published !== false ? 'true' : 'false');
    
    // Media URLs - check multiple possible field names
    console.log('🎬 DEBUG: Populating media URLs...');
    console.log('   - Raw youtube_url:', property.youtube_url);
    console.log('   - Raw virtual_tour_url:', property.virtual_tour_url);
    
    // Handle YouTube URL - check different possible field names
    let youtubeUrl = property.youtube_url || property.youtubeUrl || property.youtube || '';
    let virtualTourUrl = property.virtual_tour_url || property.virtualTourUrl || property.virtual_tour || '';
    
    console.log('   - Final YouTube URL:', youtubeUrl);
    console.log('   - Final Virtual Tour URL:', virtualTourUrl);
    
    this.setFormValue('property-youtube-url', youtubeUrl);
    this.setFormValue('property-virtual-tour-url', virtualTourUrl);

    // Clear any existing media selections
    this.clearAllMedia();

    // Show existing images in preview (for reference, but don't add to selectedMedia)
    console.log('🖼️ DEBUG: Showing existing images...');
    this.showExistingImages(property);
    
    // Populate YouTube URL if exists
    if (youtubeUrl) {
      this.selectedMedia.youtubeUrl = youtubeUrl;
      console.log('   - Set YouTube URL in selectedMedia:', youtubeUrl);
    }
    
    console.log('✅ DEBUG: Property form population completed for:', property.title);
    
    // Verify form population after a short delay
    setTimeout(() => {
      console.log('🔍 DEBUG: Verifying form population...');
      this.verifyFormPopulation();
    }, 100);
  }

  // Helper method to safely set form values
  setFormValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
      if (value !== null && value !== undefined) {
        element.value = value;
        console.log(`   ✅ Set ${id} = "${value}"`);
      } else {
        console.log(`   ⚠️ Skipped ${id} (value is null/undefined)`);
      }
    } else {
      console.error(`   ❌ Element not found: ${id}`);
    }
  }

  // Verify form population worked
  verifyFormPopulation() {
    const fieldsToCheck = [
      'property-title', 'property-type', 'property-status', 'property-price',
      'property-area', 'property-city', 'property-bedrooms', 'property-bathrooms',
      'property-size', 'property-description'
    ];
    
    console.log('🔍 DEBUG: Form verification results:');
    fieldsToCheck.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        console.log(`   ${fieldId}: "${element.value}" (${element.value ? '✅' : '❌'})`);
      } else {
        console.log(`   ${fieldId}: Element not found (❌)`);
      }
    });
  }

  // Show existing images for reference during editing
  showExistingImages(property) {
    const startTime = performance.now();
    const imagesPreview = document.getElementById('images-preview');
    if (!imagesPreview) return;

    let existingImagesHtml = '';
    
    // Handle JSONB images array from database
    let propertyImages = [];
    
    console.log('🖼️ DEBUG: Processing images for edit modal, raw images:', property.images);
    
    // Parse images from JSONB array structure
    if (property.images && Array.isArray(property.images)) {
      propertyImages = property.images;
      console.log('🖼️ DEBUG: Using array format, count:', propertyImages.length);
    } else if (property.images && typeof property.images === 'string') {
      try {
        propertyImages = JSON.parse(property.images);
        console.log('🖼️ DEBUG: Parsed JSON string, count:', propertyImages.length);
      } catch (e) {
        console.warn('Failed to parse images JSON:', e);
        propertyImages = [];
      }
    }
    
    // Show existing images from JSONB array
    if (propertyImages && propertyImages.length > 0) {
      console.log('🖼️ DEBUG: Generating HTML for', propertyImages.length, 'images');
      
      propertyImages.forEach((imageObj, index) => {
        const imageUrl = imageObj.url || imageObj;
        const isPrimary = imageObj.isPrimary || index === 0;
        
        // Check for slow base64 images
        if (imageUrl && imageUrl.startsWith('data:')) {
          console.warn(`🐌 MODAL SLOW: Edit modal showing base64 image ${index + 1} (${Math.round(imageUrl.length / 1024)}KB)`);
        }
        
        existingImagesHtml += `
          <div class="relative group border-2 ${isPrimary ? 'border-blue-200' : 'border-gray-200'} rounded-lg">
            <img src="${imageUrl}" alt="Current ${isPrimary ? 'main' : 'gallery'} image" 
                 class="w-full h-24 object-cover rounded-lg loading-shimmer transition-opacity duration-300"
                 loading="lazy"
                 onload="this.classList.remove('loading-shimmer'); console.log('✅ Modal image ${index + 1} loaded');"
                 onerror="console.warn('❌ Modal image ${index + 1} failed:', this.src); this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjBGMkY1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxjaXJjbGUgY3g9IjI2IiBjeT0iMjgiIHI9IjMiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDM2TDI4IDI4TDM2IDM2TDQ0IDI4VjQ0SDIwVjM2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'">
            <div class="absolute top-2 left-2 ${isPrimary ? 'bg-blue-500' : 'bg-gray-600'} text-white text-xs px-2 py-1 rounded-full">
              ${isPrimary ? 'Current Main' : `Gallery ${index + 1}`}
            </div>
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <span class="text-white text-xs">Upload new images to replace</span>
            </div>
          </div>
        `;
      });
    } else if (property.main_image) {
      console.log('🖼️ DEBUG: Using fallback main_image:', property.main_image.substring(0, 50) + '...');
      
      // Fallback: show main_image if no JSONB images array
      existingImagesHtml += `
        <div class="relative group border-2 border-blue-200 rounded-lg">
          <img src="${property.main_image}" alt="Current main image" 
               class="w-full h-24 object-cover rounded-lg loading-shimmer transition-opacity duration-300"
               loading="lazy"
               onload="this.classList.remove('loading-shimmer'); console.log('✅ Modal main image loaded');"
               onerror="console.warn('❌ Modal main image failed:', this.src); this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjBGMkY1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxjaXJjbGUgY3g9IjI2IiBjeT0iMjgiIHI9IjMiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDM2TDI4IDI4TDM2IDM2TDQ0IDI4VjQ0SDIwVjM2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'">
          <div class="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Current Main</div>
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <span class="text-white text-xs">Upload new images to replace</span>
          </div>
        </div>
      `;
    }

    const processingTime = performance.now() - startTime;

    if (existingImagesHtml) {
      imagesPreview.innerHTML = existingImagesHtml;
      console.log(`✅ DEBUG: Modal displayed ${propertyImages.length || 1} existing images in ${processingTime.toFixed(2)}ms`);
    } else {
      imagesPreview.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <svg class="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
          </svg>
          <p>No existing images found</p>
          <p class="text-xs">Upload new images below</p>
        </div>
      `;
      console.log(`📭 DEBUG: Modal showing no images placeholder in ${processingTime.toFixed(2)}ms`);
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
      youtubeUrl: document.getElementById('property-youtube-url')?.value?.trim() || this.selectedMedia.youtubeUrl || '',
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
      
      const isEditing = this.currentEditingId && this.currentEditingId !== 'new';
      let imagesToSave = [];
      
      console.log('💾 DEBUG: Save property - isEditing:', isEditing);
      console.log('💾 DEBUG: New images selected:', this.selectedMedia.images.length);
      
      // Handle images intelligently based on edit vs new
      if (isEditing) {
        // For editing: preserve existing images if no new ones uploaded
        if (this.selectedMedia.images && this.selectedMedia.images.length > 0) {
          console.log('📸 DEBUG: Processing new images for edited property...');
          // Clean up old images first
          await this.cleanupPropertyImages(this.currentEditingId);
          const mediaData = await this.processMediaUploads(this.currentEditingId);
          imagesToSave = mediaData.images || [];
        } else {
          console.log('📸 DEBUG: No new images - preserving existing images...');
          // Get existing images from current property data
          const existingProperty = await this.getCurrentPropertyData();
          imagesToSave = existingProperty?.images || [];
          console.log('📸 DEBUG: Preserved images count:', imagesToSave.length);
        }
      } else {
        console.log('📸 DEBUG: New property - processing uploaded images...');
        // For new properties, we'll need to handle the property ID after creation
        const tempPropertyId = Date.now(); // Temporary ID for new properties
        const mediaData = await this.processMediaUploads(tempPropertyId);
        imagesToSave = mediaData.images || [];
      }
      
      // Prepare property data for API - map to actual database schema
      const propertyPayload = {
        title: formData.title,
        type: formData.type,
        status: formData.status,
        price: formData.price,
        currency: formData.currency,
        location_area: formData.location.area,
        location_city: formData.location.city,
        location_country: formData.location.country,
        coordinates_lat: formData.location.coordinates?.lat || null,
        coordinates_lng: formData.location.coordinates?.lng || null,
        bedrooms: formData.features.bedrooms,
        bathrooms: formData.features.bathrooms,
        parking: formData.features.parking,
        size: formData.features.size,
        size_unit: formData.features.sizeUnit,
        description: formData.description,
        short_description: formData.shortDescription,
        images: imagesToSave, // Preserve existing or use new images
        videos: [], // JSONB array as per schema
        amenities: formData.amenities || [], // JSONB array as per schema
        year_built: formData.yearBuilt,
        furnished: formData.furnished,
        available: formData.available,
        featured: formData.featured,
        published: formData.published,
        virtual_tour_url: formData.virtualTourUrl || formData.youtubeUrl || null
      };

      console.log('💾 DEBUG: Final payload images count:', propertyPayload.images.length);

      const endpoint = isEditing 
        ? `/api/admin/properties/${this.currentEditingId}`
        : '/api/admin/properties';
      
      const method = isEditing ? 'PUT' : 'POST';
      
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
      
      const action = isEditing ? 'updated' : 'added';
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

  // Get current property data for preserving existing images during edit
  async getCurrentPropertyData() {
    if (!this.currentEditingId || this.currentEditingId === 'new') {
      return null;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/properties/${this.currentEditingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📡 DEBUG: Fetched existing property for image preservation:', data.property?.title);
        return data.property;
      }
    } catch (error) {
      console.error('Error fetching current property data:', error);
    }
    
    return null;
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

    // Remove any existing event listeners to prevent duplicates
    const newImagesDropZone = imagesDropZone.cloneNode(true);
    const newImagesInput = imagesInput.cloneNode(true);
    imagesDropZone.parentNode.replaceChild(newImagesDropZone, imagesDropZone);
    imagesInput.parentNode.replaceChild(newImagesInput, imagesInput);

    // Get references to the new elements
    const cleanImagesDropZone = document.getElementById('images-drop-zone');
    const cleanImagesInput = document.getElementById('images-input');

    // Click to browse files
    cleanImagesDropZone.addEventListener('click', (e) => {
      console.log('Railway images drop zone clicked!');
      e.preventDefault();
      cleanImagesInput.click();
    });

    // Handle file selection
    cleanImagesInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleMultipleImages(Array.from(e.target.files));
      }
    });

    // Drag and drop functionality
    cleanImagesDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      cleanImagesDropZone.classList.add('border-zentro-gold', 'bg-zentro-gold/10');
    });

    cleanImagesDropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      cleanImagesDropZone.classList.remove('border-zentro-gold', 'bg-zentro-gold/10');
    });

    cleanImagesDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      cleanImagesDropZone.classList.remove('border-zentro-gold', 'bg-zentro-gold/10');
      
      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      if (files.length > 0) {
        this.handleMultipleImages(Array.from(files));
      }
    });
  }

  // Handle multiple image files
  handleMultipleImages(files) {
    if (!files || files.length === 0) return;

    // Add files to selectedMedia images array
    this.selectedMedia.images = [...this.selectedMedia.images, ...files];
    
    // Update preview
    this.renderMultipleImagesPreview();
    
    console.log(`Selected ${files.length} images for Railway storage. Total: ${this.selectedMedia.images.length}`);
  }

  // Render preview for multiple images  
  renderMultipleImagesPreview() {
    const previewContainer = document.getElementById('images-preview');
    previewContainer.innerHTML = '';

    this.selectedMedia.images.forEach((file, index) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'relative group';
        
        imageContainer.innerHTML = `
          ${index === 0 ? '<div class="absolute top-2 left-2 bg-zentro-gold text-white text-xs px-2 py-1 rounded-full z-10">Main</div>' : ''}
          <img src="${e.target.result}" 
               alt="Property Image Preview ${index + 1}" 
               class="w-full h-32 object-cover rounded-lg border-2 ${index === 0 ? 'border-zentro-gold' : 'border-gray-200'}">
          <button class="remove-image-btn absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10" data-index="${index}">
            ×
          </button>
          <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            ${index + 1} of ${this.selectedMedia.images.length}
          </div>
        `;
        
        // Add event listener for remove button
        const removeBtn = imageContainer.querySelector('.remove-image-btn');
        removeBtn.addEventListener('click', () => this.removeImageAtIndex(index));
        
        previewContainer.appendChild(imageContainer);
      };
      
      reader.readAsDataURL(file);
    });
  }

  // Remove image at specific index
  removeImageAtIndex(index) {
    if (index >= 0 && index < this.selectedMedia.images.length) {
      const removedFile = this.selectedMedia.images.splice(index, 1)[0];
      this.renderMultipleImagesPreview();
      console.log(`Removed image: ${removedFile.name}. Remaining: ${this.selectedMedia.images.length}`);
    }
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
    const isEditing = this.currentEditingId && this.currentEditingId !== 'new';
    const hasNewImages = this.selectedMedia.images && this.selectedMedia.images.length > 0;
    
    console.log('🔍 DEBUG: Media validation - isEditing:', isEditing, 'hasNewImages:', hasNewImages);
    
    // For new properties, require at least one image
    if (!isEditing) {
      if (!hasNewImages) {
        throw new Error('Please select at least one image for new properties');
      }
    }
    // For existing properties, images are optional (keep existing if none uploaded)
    console.log('✅ Railway media validation passed');
    return true;
  }

  async processMediaUploads(propertyId = null) {
    // Validate media before processing
    this.validateRequiredMedia();
    
    const mediaData = {
      images: [],
      youtubeUrl: this.selectedMedia.youtubeUrl || ''
    };

    // Use existing property ID or generate a temporary one for new properties
    const targetPropertyId = propertyId || this.currentEditingId || Date.now();

    // Process multiple images - store locally with Img_X naming
    if (this.selectedMedia.images && this.selectedMedia.images.length > 0) {
      console.log(`📸 Processing ${this.selectedMedia.images.length} images for local storage...`);
      
      for (let i = 0; i < this.selectedMedia.images.length; i++) {
        const imageFile = this.selectedMedia.images[i];
        
        // Upload image to local storage with Img_X naming
        const storageUrl = await this.saveToLocalStorage(imageFile, 'image', targetPropertyId, i);
        
        const imageData = {
          url: storageUrl,
          alt: `${this.getFormData().title} - ${i === 0 ? 'Main Image' : `Gallery Image ${i + 1}`}`,
          isPrimary: i === 0, // First image is primary
          displayOrder: i,
          fileSize: imageFile.size,
          mimeType: imageFile.type
        };

        mediaData.images.push(imageData);
      }
      console.log(`✅ Processed ${this.selectedMedia.images.length} images for local storage`);
    } else {
      console.log('📸 No new images to process for local storage');
    }

    // YouTube URL is already stored in mediaData.youtubeUrl
    if (mediaData.youtubeUrl) {
      console.log(`🎬 YouTube URL set: ${mediaData.youtubeUrl}`);
    } else {
      console.log('🎬 No YouTube URL provided');
    }

    return mediaData;
  }

  // Save images locally with Img_X naming convention
  async saveToLocalStorage(file, fileType = 'image', propertyId, imageIndex) {
    try {
      console.log(`📁 Saving ${file.name} locally for property ${propertyId}...`);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Authentication required for file upload');
      }

      // Generate the new filename with Img_X format
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const newFileName = `Img_${imageIndex + 1}.${fileExtension}`;
      
      // Create FormData for local file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      formData.append('propertyId', propertyId);
      formData.append('fileName', newFileName);
      
      // Upload to local storage API endpoint
      const response = await fetch('/api/admin/upload-local', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Local upload failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ File ${file.name} saved locally as ${newFileName}:`, result.url);
      
      return result.url; // Returns the local file path
      
    } catch (error) {
      console.error('Error saving file locally:', error);
      
      // Fallback: Convert to base64 data URL for temporary display
      console.log('⚠️ Falling back to base64 storage for', file.name);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          console.log(`📸 File ${file.name} converted to base64 for display`);
          resolve(reader.result); // Returns data URL
        };
        reader.readAsDataURL(file);
      });
    }
  }

  // Clean up property images (delete old images when updating with new ones)
  async cleanupPropertyImages(propertyId) {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        console.warn('⚠️ No authentication token - skipping image cleanup');
        return;
      }

      console.log(`🗑️ Cleaning up images for property ${propertyId}...`);
      
      const response = await fetch(`/api/admin/properties/${propertyId}/images`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Successfully cleaned up images for property ${propertyId}`);
      } else {
        const errorData = await response.json();
        console.warn(`⚠️ Failed to cleanup images: ${errorData.message}`);
      }
    } catch (error) {
      console.warn('⚠️ Error during image cleanup (continuing with upload):', error.message);
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
    const renderStart = performance.now();
    console.log('🔄 DEBUG: Starting renderProperties with', this.filteredProperties.length, 'properties');
    
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

    const imageProcessingStart = performance.now();
    
    // Pre-process images to measure total time
    const processedProperties = this.filteredProperties.map(property => {
      const imageHtml = this.getPropertyImageHtml(property);
      return { ...property, imageHtml };
    });
    
    const imageProcessingTime = performance.now() - imageProcessingStart;
    console.log(`🖼️ DEBUG: Image processing for ${this.filteredProperties.length} properties took ${imageProcessingTime.toFixed(2)}ms`);

    const htmlGenerationStart = performance.now();

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
            ${processedProperties.map(property => `
              <tr class="border-t border-t-[#dbe0e6]">
                <td class="h-[72px] px-4 py-2 text-zentro-dark text-sm font-normal">${property.id}</td>
                <td class="h-[72px] px-4 py-2">
                  <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                    ${property.imageHtml}
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
                    <button data-action="edit" data-property-id="${property.id}" class="text-zentro-dark text-sm font-bold tracking-[0.015em] hover:text-zentro-gold transition-colors">
                      Edit
                    </button>
                    <button data-action="delete" data-property-id="${property.id}" class="text-red-500 text-sm font-bold tracking-[0.015em] hover:text-red-600 transition-colors">
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

    const totalRenderTime = performance.now() - renderStart;
    const htmlGenerationTime = performance.now() - htmlGenerationStart;
    
    console.log(`⏱️ DEBUG: Render timing breakdown:`);
    console.log(`   - Image processing: ${imageProcessingTime.toFixed(2)}ms`);
    console.log(`   - HTML generation: ${htmlGenerationTime.toFixed(2)}ms`);
    console.log(`   - Total render time: ${totalRenderTime.toFixed(2)}ms`);
    
    if (totalRenderTime > 100) {
      console.warn(`🐌 SLOW RENDER: Properties took ${totalRenderTime.toFixed(2)}ms to render (>100ms)`);
    }
  }

  async editProperty(id) {
    try {
      console.log(`🔧 DEBUG: Editing property with ID: ${id}`);
      
      // ALWAYS fetch full property details for editing (list data is incomplete)
      console.log('📡 DEBUG: Fetching complete property details from database...');
      const token = localStorage.getItem('admin_token');
      if (!token) {
        this.showNotification('Authentication required. Please login again.', 'error');
        return;
      }

      const response = await fetch(`/api/admin/properties/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch property details');
      }

      const data = await response.json();
      const property = data.property;
      console.log('📡 DEBUG: Fetched complete property from API:', property);

      if (property) {
        console.log('✅ DEBUG: Complete property data structure:');
        console.log('   - ID:', property.id);
        console.log('   - Title:', property.title);
        console.log('   - Description:', property.description ? 'Present' : 'Missing');
        console.log('   - Short Description:', property.short_description ? 'Present' : 'Missing');
        console.log('   - Images:', property.images ? (Array.isArray(property.images) ? `Array(${property.images.length})` : 'Present') : 'Missing');
        console.log('   - Amenities:', property.amenities ? (Array.isArray(property.amenities) ? `Array(${property.amenities.length})` : 'Present') : 'Missing');
        console.log('   - Virtual Tour URL:', property.virtual_tour_url ? 'Present' : 'Missing');
        console.log('   - Year Built:', property.year_built ? property.year_built : 'Missing');
        console.log('   - Furnished:', property.furnished);
        console.log('   - Full property object:', property);
        
        console.log('🎬 DEBUG: Opening edit modal with complete property data:', property.title);
        this.openPropertyModal(property);
      } else {
        console.error('❌ DEBUG: Property not found');
        this.showNotification('Property not found', 'error');
      }
    } catch (error) {
      console.error('❌ DEBUG: Error opening edit modal:', error);
      this.showNotification('Failed to load property for editing: ' + error.message, 'error');
    }
  }

  async deleteProperty(id) {
    console.log('🗑️ DEBUG: Delete property initiated for ID:', id);
    
    // Show custom danger confirmation
    console.log('🚨 DEBUG: Showing danger confirmation modal...');
    const confirmed = await this.showDangerConfirmation(
      'Delete Property?', 
      'This action cannot be undone. The property will be permanently deleted from the database.'
    );
    
    console.log('🤔 DEBUG: User confirmation result:', confirmed);
    
    if (!confirmed) {
      console.log('❌ DEBUG: User cancelled deletion');
      return;
    }

    console.log('✅ DEBUG: User confirmed deletion - proceeding...');

    const token = localStorage.getItem('admin_token');
    if (!token) {
      console.error('❌ DEBUG: No authentication token found');
      this.showNotification('Authentication required. Please login again.', 'error');
      return;
    }

    console.log('🔑 DEBUG: Authentication token found, making API call...');

    try {
      this.setLoading(true);
      console.log(`🗑️ DEBUG: Sending DELETE request to /api/admin/properties/${id}`);
      
      const response = await fetch(`/api/admin/properties/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 DEBUG: API response status:', response.status);
      console.log('📡 DEBUG: API response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ DEBUG: API error response:', errorData);
        throw new Error(errorData.error || 'Failed to delete property');
      }

      const responseData = await response.json();
      console.log('✅ DEBUG: Delete API success response:', responseData);

      console.log('🔄 DEBUG: Reloading properties list...');
      await this.loadPropertiesFromDatabase();
      this.renderProperties();
      this.updateDashboard();
      
      this.showNotification('Property deleted successfully!', 'success');
      console.log('🎉 DEBUG: Property deletion completed successfully');
      
    } catch (error) {
      console.error('💥 DEBUG: Error during deletion process:', error);
      console.error('💥 DEBUG: Error stack:', error.stack);
      this.showNotification('Error deleting property: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
      console.log('🔄 DEBUG: Delete operation finished, loading state cleared');
    }
  }

  // Custom danger confirmation modal with consistent styling and debugging
  showDangerConfirmation(title, message) {
    console.log('🚨 DEBUG: Creating danger confirmation modal');
    console.log('   - Title:', title);
    console.log('   - Message:', message);
    
    return new Promise((resolve) => {
      // Create danger modal with consistent admin styling
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-fadeIn';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-md w-full mx-4 shadow-2xl border border-gray-100 animate-slideIn">
          <div class="p-8 text-center">
            <!-- Danger Icon -->
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 border-4 border-red-100 mb-6">
              <svg class="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.312 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            
            <!-- Title -->
            <h3 class="text-2xl font-bold text-red-600 mb-3">${title}</h3>
            
            <!-- Message -->
            <p class="text-gray-600 text-base leading-relaxed mb-8">${message}</p>
            
            <!-- Action Buttons -->
            <div style="display: flex; gap: 16px; justify-content: center; margin-top: 20px;">
              <button id="cancel-danger" style="padding: 12px 24px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; cursor: pointer;">
                Cancel
              </button>
              <button id="confirm-danger" style="padding: 12px 24px; background: #dc2626; color: white; font-weight: bold; border: none; border-radius: 8px; cursor: pointer;">
                DELETE
              </button>
            </div>
          </div>
        </div>
      `;

      // Add modal to body
      document.body.appendChild(modal);
      console.log('✅ DEBUG: Modal added to DOM');
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Wait for DOM to render then attach events
      setTimeout(() => {
        const cancelBtn = modal.querySelector('#cancel-danger');
        const confirmBtn = modal.querySelector('#confirm-danger');
        
        console.log('🔍 DEBUG: Button elements found:');
        console.log('   - Cancel button:', !!cancelBtn);
        console.log('   - Confirm button:', !!confirmBtn);
        
        if (cancelBtn) {
          console.log('   - Cancel button text:', cancelBtn.textContent.trim());
          console.log('   - Cancel button visible:', cancelBtn.offsetWidth > 0 && cancelBtn.offsetHeight > 0);
          
          cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('❌ DEBUG: Cancel button clicked');
            modal.classList.add('animate-fadeOut');
            setTimeout(() => {
              if (modal.parentNode) {
                document.body.removeChild(modal);
                document.body.style.overflow = '';
              }
            }, 200);
            resolve(false);
          });
        } else {
          console.error('❌ CRITICAL: Cancel button not found!');
        }

        if (confirmBtn) {
          console.log('   - Confirm button text:', confirmBtn.textContent.trim());
          console.log('   - Confirm button visible:', confirmBtn.offsetWidth > 0 && confirmBtn.offsetHeight > 0);
          
          confirmBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ DEBUG: Confirm/Delete button clicked - proceeding with deletion');
            modal.classList.add('animate-fadeOut');
            setTimeout(() => {
              if (modal.parentNode) {
                document.body.removeChild(modal);
                document.body.style.overflow = '';
              }
            }, 200);
            resolve(true);
          });
        } else {
          console.error('❌ CRITICAL: Confirm button not found!');
        }
      }, 50);

      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          console.log('🖱️ DEBUG: Background clicked - canceling');
          modal.classList.add('animate-fadeOut');
          setTimeout(() => {
            if (modal.parentNode) {
              document.body.removeChild(modal);
              document.body.style.overflow = '';
            }
          }, 200);
          resolve(false);
        }
      });

      // Close on Escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          console.log('⌨️ DEBUG: Escape key pressed - canceling');
          modal.classList.add('animate-fadeOut');
          setTimeout(() => {
            if (modal.parentNode) {
              document.body.removeChild(modal);
              document.body.style.overflow = '';
            }
          }, 200);
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
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

  // Get property image HTML with proper fallbacks and loading optimization
  getPropertyImageHtml(property) {
    const startTime = performance.now();
    
    // Try to get image URL from different sources
    let imageUrl = null;
    let imageSource = '';
    
    // First try main_image (extracted from JSONB by SQL)
    if (property.main_image) {
      imageUrl = property.main_image;
      imageSource = 'main_image';
    }
    // Then try first image from JSONB array
    else if (property.images && Array.isArray(property.images) && property.images.length > 0) {
      imageUrl = property.images[0].url || property.images[0];
      imageSource = 'images_array';
    }
    // Try to parse JSONB string
    else if (property.images && typeof property.images === 'string') {
      try {
        const parsedImages = JSON.parse(property.images);
        if (parsedImages && parsedImages.length > 0) {
          imageUrl = parsedImages[0].url || parsedImages[0];
          imageSource = 'parsed_images';
        }
      } catch (e) {
        console.warn('Failed to parse images JSON for property:', property.id);
      }
    }
    
    const processingTime = performance.now() - startTime;
    console.log(`⏱️ DEBUG: Image processing for property ${property.id} took ${processingTime.toFixed(2)}ms, source: ${imageSource}, url: ${imageUrl ? imageUrl.substring(0, 50) + '...' : 'none'}`);
    
    if (imageUrl) {
      // Check if it's a base64 image (which can be slow)
      const isBase64 = imageUrl.startsWith('data:');
      if (isBase64) {
        console.warn(`🐌 SLOW: Property ${property.id} using base64 image (${Math.round(imageUrl.length / 1024)}KB)`);
      }
      
      return `
        <img src="${imageUrl}" 
             alt="${property.title || 'Property'}" 
             class="w-full h-full object-cover transition-opacity duration-200 ${isBase64 ? 'loading-shimmer' : ''}" 
             loading="lazy"
             onload="this.classList.remove('loading-shimmer'); console.log('✅ Image loaded for property ${property.id}');" 
             onerror="console.warn('❌ Image failed for property ${property.id}:', this.src); this.parentElement.innerHTML='<svg class=\\'w-8 h-8 text-gray-400\\' fill=\\'none\\' stroke=\\'currentColor\\' viewBox=\\'0 0 24 24\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z\\'></path></svg>'">
      `;
    } else {
      return `<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>`;
    }
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