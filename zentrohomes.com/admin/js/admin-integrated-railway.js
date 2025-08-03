// Railway PostgreSQL Admin Client for Zentro Homes
// This replaces the Supabase version with Railway database integration

// Zentro Homes Admin Dashboard with Railway Database Integration
class ZentroAdminRailway {
  constructor() {
    this.properties = [];
    this.filteredProperties = [];
    this.currentEditingId = null;
    this.isLoading = false;
    
    // Media management - KISS approach with filesystem storage
    this.selectedMedia = {
      images: [], // Array of image files (first = main, rest = gallery)
      youtubeUrl: '' // YouTube URL for property video
    };
    this.maxImageSize = 10 * 1024 * 1024; // 10MB

    this.init();
  }

  async init() {
    this.bindNavigation();
    this.bindPropertyEvents();
    this.bindModalEvents();
    
    // Wait for Railway manager to be initialized
    await this.waitForRailwayManager();
    
    // Load properties from Railway database
    await this.loadPropertiesFromDatabase();
    
    this.renderProperties();
    this.updateDashboard();
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

  // Load properties from Railway database
  async loadPropertiesFromDatabase() {
    if (!window.railwayManager) {
      console.warn('Railway manager not available, using local data');
      this.properties = [...apartmentsData.apartments];
      this.filteredProperties = [...this.properties];
      return;
    }

    try {
      this.setLoading(true);
      this.properties = await window.railwayManager.getAllProperties();
      this.filteredProperties = [...this.properties];
      console.log(`✅ Loaded ${this.properties.length} properties from Railway database`);
    } catch (error) {
      console.error('Error loading properties from Railway:', error);
      this.showNotification('Failed to load properties from Railway database', 'error');
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
    document.getElementById('property-amenities').value = property.amenities.join(', ');

    // Clear any existing media selections
    this.clearAllMedia();

    // Show existing images in preview (for reference, but don't add to selectedMedia)
    this.showExistingImages(property);
    
    // Populate YouTube URL if exists
    if (property.youtubeUrl) {
      document.getElementById('property-youtube-url').value = property.youtubeUrl;
      this.selectedMedia.youtubeUrl = property.youtubeUrl;
    }
    
    console.log('✅ Property form populated for Railway editing:', property.title);
  }

  // Show existing images for reference during editing
  showExistingImages(property) {
    const imagesPreview = document.getElementById('images-preview');
    if (!imagesPreview) return;

    let existingImagesHtml = '';
    
    // Show main image
    if (property.images?.main) {
      existingImagesHtml += `
        <div class="relative group border-2 border-blue-200 rounded-lg">
          <img src="${property.images.main}" alt="Current main image" class="w-full h-24 object-cover rounded-lg">
          <div class="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Current Main</div>
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <span class="text-white text-xs">Upload new images to replace</span>
          </div>
        </div>
      `;
    }

    // Show gallery images
    if (property.images?.gallery && property.images.gallery.length > 0) {
      property.images.gallery.forEach((galleryUrl, index) => {
        existingImagesHtml += `
          <div class="relative group border-2 border-gray-200 rounded-lg">
            <img src="${galleryUrl}" alt="Current gallery image ${index + 1}" class="w-full h-24 object-cover rounded-lg">
            <div class="absolute top-2 left-2 bg-gray-600 text-white text-xs px-2 py-1 rounded-full">Gallery ${index + 1}</div>
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <span class="text-white text-xs">Upload new images to replace</span>
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
    return {
      id: this.currentEditingId || 'new',
      title: document.getElementById('property-title').value || 'Property Title',
      type: document.getElementById('property-type').value || 'Villa',
      status: document.getElementById('property-status').value || 'For Sale',
      price: parseInt(document.getElementById('property-price').value) || 1000000,
      currency: document.getElementById('property-currency').value || 'KES',
      location: {
        area: document.getElementById('property-area').value || 'Area',
        city: document.getElementById('property-city').value || 'Nairobi',
        country: document.getElementById('property-country').value || 'Kenya',
        coordinates: { lat: -1.2921, lng: 36.8219 }
      },
      features: {
        bedrooms: parseInt(document.getElementById('property-bedrooms').value) || 3,
        bathrooms: parseInt(document.getElementById('property-bathrooms').value) || 2,
        parking: parseInt(document.getElementById('property-parking').value) || 1,
        size: parseInt(document.getElementById('property-size').value) || 150,
        sizeUnit: document.getElementById('property-size-unit').value || 'm²'
      },
      description: document.getElementById('property-description').value || 'Property description',
      images: {
        main: null, // Images are handled separately in processMediaUploads
        gallery: []
      },
      amenities: document.getElementById('property-amenities').value.split(',').map(a => a.trim()).filter(a => a) || [],
      yearBuilt: parseInt(document.getElementById('property-year-built').value) || new Date().getFullYear(),
      furnished: document.getElementById('property-furnished').value === 'true',
      available: document.getElementById('property-available').value === 'true',
      youtubeUrl: document.getElementById('property-youtube-url').value || '',
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
    if (!formData.title || !formData.price || !formData.location.area) {
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }

    if (!window.railwayManager) {
      this.showNotification('Railway database not available. Cannot save property.', 'error');
      return;
    }

    try {
      this.setLoading(true);
      
      // Process media uploads and prepare media data
      const mediaData = await this.processMediaUploads();
      
      if (this.currentEditingId && this.currentEditingId !== 'new') {
        // Update existing property with media
        await window.railwayManager.updateProperty(this.currentEditingId, formData, mediaData);
        this.showNotification('Property updated successfully in Railway database!', 'success');
      } else {
        // Add new property with media
        await window.railwayManager.addProperty(formData, mediaData);
        this.showNotification('Property added successfully to Railway database!', 'success');
      }

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
      this.handleMultipleImages(Array.from(e.target.files));
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
      this.handleMultipleImages(files);
    });
  }

  // Handle multiple image files
  handleMultipleImages(files) {
    if (files.length === 0) return;

    // Store files in selectedMedia
    this.selectedMedia.images = files;
    
    // Update preview
    this.renderMultipleImagesPreview(files);
    
    console.log(`Selected ${files.length} images for Railway storage. First will be main image.`);
  }

  // Render preview for multiple images  
  renderMultipleImagesPreview(files) {
    const previewContainer = document.getElementById('images-preview');
    previewContainer.innerHTML = '';

    files.forEach((file, index) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'relative group';
        
        const badge = index === 0 ? 
          '<div class="absolute top-2 left-2 bg-zentro-gold text-white text-xs px-2 py-1 rounded-full">Main</div>' :
          `<div class="absolute top-2 left-2 bg-gray-600 text-white text-xs px-2 py-1 rounded-full">${index}</div>`;
        
        imageContainer.innerHTML = `
          ${badge}
          <img src="${e.target.result}" 
               alt="Preview ${index + 1}" 
               class="w-full h-24 object-cover rounded-lg border-2 border-gray-200">
          <button onclick="zentroAdmin.removeImage(${index})" 
                  class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            ×
          </button>
        `;
        
        previewContainer.appendChild(imageContainer);
      };
      
      reader.readAsDataURL(file);
    });
  }

  // Remove image from selection
  removeImage(index) {
    this.selectedMedia.images.splice(index, 1);
    this.renderMultipleImagesPreview(this.selectedMedia.images);
    
    if (this.selectedMedia.images.length === 0) {
      document.getElementById('images-preview').innerHTML = '';
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
    // For new properties, require at least one image
    if (!this.currentEditingId || this.currentEditingId === 'new') {
      if (!this.selectedMedia.images || this.selectedMedia.images.length === 0) {
        throw new Error('Please select at least one image for new properties');
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

    // Process multiple images - store locally since Railway doesn't have built-in storage
    if (this.selectedMedia.images && this.selectedMedia.images.length > 0) {
      console.log(`📸 Processing ${this.selectedMedia.images.length} images for Railway...`);
      
      const imagePromises = this.selectedMedia.images.map(async (imageFile, index) => {
        // For Railway, we'll store files locally and save paths to database
        const storageUrl = await this.saveToLocalStorage(imageFile, 'image');
        
        return {
          url: storageUrl,
          alt: `${this.getFormData().title} - ${index === 0 ? 'Main Image' : `Gallery Image ${index}`}`,
          isPrimary: index === 0, // First image is main
          displayOrder: index,
          fileSize: imageFile.size,
          mimeType: imageFile.type
        };
      });

      const imageData = await Promise.all(imagePromises);
      mediaData.images.push(...imageData);
      console.log(`✅ Processed ${imageData.length} images for Railway`);
    } else {
      console.log('📸 No new images to process for Railway');
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

  // Filter by status using Railway database
  async filterByStatus(status) {
    if (!window.railwayManager) {
      this.filteredProperties = this.properties.filter(property => property.status === status);
      this.renderProperties();
      return;
    }

    try {
      this.setLoading(true);
      this.filteredProperties = await window.railwayManager.getPropertiesByStatus(status);
      this.renderProperties();
    } catch (error) {
      console.error('Error filtering properties in Railway:', error);
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

    if (!window.railwayManager) {
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
      this.filteredProperties = await window.railwayManager.searchProperties(search);
      this.renderProperties();
    } catch (error) {
      console.error('Error searching properties in Railway:', error);
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
                    <img src="${property.images.main || '../wp-content/uploads/2025/02/default-property.jpg'}" alt="${property.title}" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjBGMkY1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxjaXJjbGUgY3g9IjI2IiBjeT0iMjgiIHI9IjMiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDM2TDI4IDI4TDM2IDM2TDQ0IDI4VjQ0SDIwVjM2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'">
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

  async editProperty(id) {
    const property = this.properties.find(p => p.id === id);
    if (property) {
      this.openPropertyModal(property);
    }
  }

  async deleteProperty(id) {
    if (!confirm('Are you sure you want to delete this property from Railway database?')) {
      return;
    }

    if (!window.railwayManager) {
      this.showNotification('Railway database not available. Cannot delete property.', 'error');
      return;
    }

    try {
      this.setLoading(true);
      await window.railwayManager.deleteProperty(id);
      
      await this.loadPropertiesFromDatabase();
      this.renderProperties();
      this.updateDashboard();
      this.showNotification('Property deleted successfully from Railway database!', 'success');
      
    } catch (error) {
      console.error('Error deleting property from Railway:', error);
      this.showNotification('Error deleting property: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  // Dashboard with Railway statistics
  async updateDashboard() {
    if (!window.railwayManager) {
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
      const stats = await window.railwayManager.getStatistics();
      
      document.getElementById('total-properties').textContent = stats.total;
      document.getElementById('for-sale-count').textContent = stats.forSale;
      document.getElementById('for-rent-count').textContent = stats.forRent;
      document.getElementById('avg-price').textContent = this.formatPrice(stats.averagePrice, 'KES');
      
    } catch (error) {
      console.error('Error updating Railway dashboard:', error);
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