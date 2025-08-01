// Zentro Homes Admin Dashboard
class ZentroAdmin {
  constructor() {
    // Use the shared data manager to get properties
    this.properties = window.sharedDataManager ? 
      window.sharedDataManager.getAllApartments() : 
      [...apartmentsData.apartments];
    
    this.filteredProperties = [...this.properties];
    this.currentEditingId = null;
    this.selectedFiles = {
      photos: [],
      videos: []
    };

    this.init();
  }

  init() {
    this.bindNavigation();
    this.bindPropertyEvents();
    this.bindMediaEvents();
    this.bindModalEvents();
    this.renderProperties();
    this.updateDashboard();
    this.populateMediaPropertySelect();
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

    // Search and filters
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

  filterByStatus(status) {
    const search = document.getElementById('property-search').value.toLowerCase();

    this.filteredProperties = this.properties.filter(property => {
      const matchesSearch = !search ||
        property.title.toLowerCase().includes(search) ||
        property.location.area.toLowerCase().includes(search) ||
        property.location.city.toLowerCase().includes(search);

      const matchesStatus = property.status === status;

      return matchesSearch && matchesStatus;
    });

    this.renderProperties();
  }

  filterProperties() {
    const search = document.getElementById('property-search').value.toLowerCase();
    
    this.filteredProperties = this.properties.filter(property => {
      const matchesSearch = !search ||
        property.title.toLowerCase().includes(search) ||
        property.location.area.toLowerCase().includes(search) ||
        property.location.city.toLowerCase().includes(search);

      return matchesSearch;
    });

    this.renderProperties();
  }

  renderProperties() {
    const container = document.getElementById('properties-list');

    if (this.filteredProperties.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-gray-500">
            <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-8 0H3m2 0h6M9 7h6m-6 4h6m-6 4h6m-6 4h6"></path>
            </svg>
            <p class="text-lg font-medium">No properties found</p>
            <p class="text-sm mt-2">Try adjusting your search criteria</p>
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
              <th class="px-4 py-3 text-left text-zentro-dark text-sm font-medium">Address</th>
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
                    <img src="${property.images.main}" alt="${property.title}" class="w-full h-full object-cover">
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
                <td class="h-[72px] px-4 py-2 text-zentro-dark text-sm font-medium">${ApartmentUtils.formatPrice(property.price, property.currency)}</td>
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
    const formData = {
      id: this.currentEditingId || Math.max(...this.properties.map(p => p.id)) + 1,
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
      available: true,
      dateAdded: new Date().toISOString().split('T')[0]
    };
    
    // Create or update preview container
    let previewContainer = document.getElementById('property-preview');
    if (!previewContainer) {
      previewContainer = document.createElement('div');
      previewContainer.id = 'property-preview';
      previewContainer.className = 'mt-8 p-6 border-t border-[#dbe0e6]';
      
      const heading = document.createElement('h3');
      heading.className = 'text-zentro-dark text-lg font-bold mb-6';
      heading.textContent = 'Property Preview';
      
      previewContainer.appendChild(heading);
      document.getElementById('property-form').appendChild(previewContainer);
    }
    
    // Generate preview HTML - Modern card style matching the front-end
    const previewHTML = `
      <div class="property-card">
        <div class="property-image-wrapper">
          <img src="${formData.images.main}" alt="${formData.title}" class="property-image">
          <div class="property-tags">
            <span class="property-tag tag-${formData.status.toLowerCase().replace(' ', '-')}">${formData.status}</span>
          </div>
          <div class="property-price">${ApartmentUtils.formatPrice(formData.price, formData.currency)}</div>
          <button class="expand-button" aria-label="View details">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>
          <div class="property-branding">
            <span>ZENTRO HOMES</span>
          </div>
        </div>
        
        <div class="property-content">
          <h3 class="property-title">${formData.title}</h3>
          <p class="property-location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            ${formData.location.area}, ${formData.location.city}
          </p>
          
          <div class="property-features">
            <div class="feature-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21V8l9-7 9 7v13h-6v-7h-6v7H3z"/>
              </svg>
              ${formData.features.bedrooms} beds
            </div>
            <div class="feature-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 14v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M17 5H7a2 2 0 0 0-2 2v3h14V7a2 2 0 0 0-2-2zM5 10h14"/>
              </svg>
              ${formData.features.bathrooms} baths
            </div>
            <div class="feature-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
              ${formData.features.size}${formData.features.sizeUnit}
            </div>
          </div>
          
          <div class="property-type">${formData.type}</div>
        </div>
      </div>
      <p class="text-sm text-gray-500 text-center mt-4">This is how your property will appear on the website</p>
    `;
    
    // Update preview content
    previewContainer.innerHTML = `
      <h3 class="text-zentro-dark text-lg font-bold mb-6">Property Preview</h3>
      ${previewHTML}
    `;

    // Add the CSS for the preview
    this.addPreviewStyles();
  }

  addPreviewStyles() {
    // Check if styles are already added
    if (document.getElementById('preview-styles')) return;

    const styleElement = document.createElement('style');
    styleElement.id = 'preview-styles';
    styleElement.textContent = `
      .property-card {
        background: #fff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        transition: transform 0.3s, box-shadow 0.3s;
        max-width: 400px;
        margin: 0 auto;
      }
      
      .property-image-wrapper {
        position: relative;
        height: 200px;
        overflow: hidden;
      }
      
      .property-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s;
      }
      
      .property-tags {
        position: absolute;
        top: 12px;
        left: 12px;
        display: flex;
        gap: 8px;
      }
      
      .property-tag {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        padding: 4px 8px;
        border-radius: 4px;
        letter-spacing: 0.5px;
      }
      
      .tag-featured {
        background-color: #bfa16b;
        color: white;
      }
      
      .tag-for-sale {
        background-color: #00987a;
        color: white;
      }
      
      .tag-for-rent {
        background-color: #bfa16b;
        color: white;
      }
      
      .property-price {
        position: absolute;
        bottom: 12px;
        left: 12px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 14px;
      }

      .expand-button {
        position: absolute;
        bottom: 12px;
        right: 12px;
        background: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        color: #171e22;
      }
      
      .property-branding {
        position: absolute;
        top: 12px;
        right: 12px;
        background: rgba(255, 255, 255, 0.9);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        color: #171e22;
      }
      
      .property-content {
        padding: 16px;
      }
      
      .property-title {
        font-size: 16px;
        font-weight: 600;
        color: #171e22;
        margin-bottom: 4px;
      }
      
      .property-location {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #666;
        margin-bottom: 12px;
      }
      
      .property-features {
        display: flex;
        gap: 16px;
        margin-bottom: 12px;
      }
      
      .feature-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #666;
      }
      
      .property-type {
        display: inline-block;
        font-size: 11px;
        font-weight: 600;
        color: #171e22;
        background: #f0f2f5;
        padding: 4px 8px;
        border-radius: 4px;
        text-transform: uppercase;
      }
    `;
    
    document.head.appendChild(styleElement);
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

  saveProperty() {
    const formData = {
      title: document.getElementById('property-title').value,
      type: document.getElementById('property-type').value,
      status: document.getElementById('property-status').value,
      price: parseInt(document.getElementById('property-price').value),
      location: {
        area: document.getElementById('property-area').value,
        city: document.getElementById('property-city').value,
        country: 'Kenya',
        coordinates: { lat: -1.2921, lng: 36.8219 }
      },
      features: {
        bedrooms: parseInt(document.getElementById('property-bedrooms').value),
        bathrooms: parseInt(document.getElementById('property-bathrooms').value),
        parking: parseInt(document.getElementById('property-parking').value),
        size: parseInt(document.getElementById('property-size').value),
        sizeUnit: 'm²'
      },
      description: document.getElementById('property-description').value,
      images: {
        main: document.getElementById('property-image').value,
        gallery: []
      },
      amenities: document.getElementById('property-amenities').value.split(',').map(a => a.trim()).filter(a => a),
      currency: 'KES',
      yearBuilt: 2023,
      furnished: true,
      available: true,
      dateAdded: new Date().toISOString().split('T')[0]
    };

    if (this.currentEditingId) {
      // Edit existing property
      const index = this.properties.findIndex(p => p.id === this.currentEditingId);
      if (index !== -1) {
        this.properties[index] = { ...this.properties[index], ...formData };
        
        // Update in shared data manager
        if (window.sharedDataManager) {
          window.sharedDataManager.updateApartment(this.currentEditingId, formData);
        }
        
        this.showNotification('Property updated successfully!', 'success');
      }
    } else {
      // Add new property
      const newId = Math.max(...this.properties.map(p => p.id)) + 1;
      const newProperty = { id: newId, ...formData };
      this.properties.push(newProperty);
      
      // Add to shared data manager
      if (window.sharedDataManager) {
        window.sharedDataManager.addApartment(formData);
      }
      
      this.showNotification('Property added successfully!', 'success');
    }

    this.closePropertyModal();
    this.filterProperties();
    this.updateDashboard();
    this.populateMediaPropertySelect();
  }

  editProperty(id) {
    const property = this.properties.find(p => p.id === id);
    if (property) {
      this.openPropertyModal(property);
    }
  }

  deleteProperty(id) {
    if (confirm('Are you sure you want to delete this property?')) {
      this.properties = this.properties.filter(p => p.id !== id);
      
      // Delete from shared data manager
      if (window.sharedDataManager) {
        window.sharedDataManager.deleteApartment(id);
      }
      
      this.filterProperties();
      this.updateDashboard();
      this.populateMediaPropertySelect();
      this.showNotification('Property deleted successfully!', 'success');
    }
  }

  // Media handling - similar to sample.html functionality
  bindMediaEvents() {
    const photoDropZone = document.getElementById('photo-drop-zone');
    const videoDropZone = document.getElementById('video-drop-zone');
    const photoFileInput = document.getElementById('photo-file-input');
    const videoFileInput = document.getElementById('video-file-input');
    const photoBrowseBtn = document.getElementById('photo-browse-btn');
    const videoBrowseBtn = document.getElementById('video-browse-btn');
    const uploadBtn = document.getElementById('upload-btn');

    // Fix media section scrolling
    const mediaSection = document.getElementById('media-section');
    if (mediaSection) {
      mediaSection.style.maxHeight = '80vh';
      mediaSection.style.overflowY = 'auto';
    }

    // Photo events
    photoDropZone.addEventListener('click', () => {
      photoFileInput.click();
    });

    photoBrowseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      photoFileInput.click();
    });

    photoFileInput.addEventListener('change', (e) => {
      this.handleFileSelection(e.target.files, 'photos');
    });

    // Video events
    videoDropZone.addEventListener('click', () => {
      videoFileInput.click();
    });

    videoBrowseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      videoFileInput.click();
    });

    videoFileInput.addEventListener('change', (e) => {
      this.handleFileSelection(e.target.files, 'videos');
    });

    // Drag and drop for photos
    photoDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      photoDropZone.classList.add('border-zentro-gold');
    });

    photoDropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      photoDropZone.classList.remove('border-zentro-gold');
    });

    photoDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      photoDropZone.classList.remove('border-zentro-gold');
      this.handleFileSelection(e.dataTransfer.files, 'photos');
    });

    // Drag and drop for videos
    videoDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      videoDropZone.classList.add('border-zentro-gold');
    });

    videoDropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      videoDropZone.classList.remove('border-zentro-gold');
    });

    videoDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      videoDropZone.classList.remove('border-zentro-gold');
      this.handleFileSelection(e.dataTransfer.files, 'videos');
    });

    // Upload button
    uploadBtn.addEventListener('click', () => {
      this.uploadMedia();
    });
  }

  handleFileSelection(files, type) {
    const acceptedTypes = type === 'photos' ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] : ['video/mp4', 'video/webm', 'video/ogg'];

    Array.from(files).forEach(file => {
      if (acceptedTypes.some(acceptedType => file.type.startsWith(acceptedType))) {
        this.selectedFiles[type].push(file);
      }
    });

    this.updateFileDisplay();
  }

  updateFileDisplay() {
    const photoZone = document.getElementById('photo-drop-zone');
    const videoZone = document.getElementById('video-drop-zone');

    if (this.selectedFiles.photos.length > 0) {
      // Create preview container if it doesn't exist
      let previewContainer = document.getElementById('photo-previews');
      if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'photo-previews';
        previewContainer.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6';
        photoZone.parentNode.insertBefore(previewContainer, photoZone.nextSibling);
      } else {
        previewContainer.innerHTML = '';
      }
      
      // Update text in drop zone
      const titleElement = photoZone.querySelector('p:first-child');
      if (titleElement) {
        titleElement.textContent = `${this.selectedFiles.photos.length} photo(s) selected`;
      }
      
      // Create previews
      this.selectedFiles.photos.forEach((file, index) => {
        const preview = document.createElement('div');
        preview.className = 'relative rounded-lg overflow-hidden border border-[#dbe0e6]';
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'w-full h-32 object-cover';
        img.alt = 'Preview';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = (e) => {
          e.preventDefault();
          this.selectedFiles.photos.splice(index, 1);
          this.updateFileDisplay();
        };
        
        preview.appendChild(img);
        preview.appendChild(removeBtn);
        previewContainer.appendChild(preview);
      });
    } else {
      // Remove preview container if it exists
      const previewContainer = document.getElementById('photo-previews');
      if (previewContainer) {
        previewContainer.remove();
      }
      
      // Reset text in drop zone
      const titleElement = photoZone.querySelector('p:first-child');
      if (titleElement) {
        titleElement.textContent = 'Drag and drop photos here';
      }
    }
    
    if (this.selectedFiles.videos.length > 0) {
      // Create preview container if it doesn't exist
      let previewContainer = document.getElementById('video-previews');
      if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'video-previews';
        previewContainer.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6';
        videoZone.parentNode.insertBefore(previewContainer, videoZone.nextSibling);
      } else {
        previewContainer.innerHTML = '';
      }
      
      // Update text in drop zone
      const titleElement = videoZone.querySelector('p:first-child');
      if (titleElement) {
        titleElement.textContent = `${this.selectedFiles.videos.length} video(s) selected`;
      }
      
      // Create previews
      this.selectedFiles.videos.forEach((file, index) => {
        const preview = document.createElement('div');
        preview.className = 'relative rounded-lg overflow-hidden border border-[#dbe0e6]';
        
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.className = 'w-full h-32 object-cover';
        video.controls = true;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = (e) => {
          e.preventDefault();
          this.selectedFiles.videos.splice(index, 1);
          this.updateFileDisplay();
        };
        
        preview.appendChild(video);
        preview.appendChild(removeBtn);
        previewContainer.appendChild(preview);
      });
    } else {
      // Remove preview container if it exists
      const previewContainer = document.getElementById('video-previews');
      if (previewContainer) {
        previewContainer.remove();
      }
      
      // Reset text in drop zone
      const titleElement = videoZone.querySelector('p:first-child');
      if (titleElement) {
        titleElement.textContent = 'Drag and drop videos here';
      }
    }
  }

  uploadMedia() {
    const selectedProperty = document.getElementById('media-property-select').value;

    if (!selectedProperty) {
      this.showNotification('Please select a property first', 'error');
      return;
    }

    if (this.selectedFiles.photos.length === 0 && this.selectedFiles.videos.length === 0) {
      this.showNotification('Please select files to upload', 'error');
      return;
    }

    // Simulate upload process
    this.showNotification('Uploading media...', 'info');

    setTimeout(() => {
      // In a real application, you would upload to server here
      // For now, we'll just update the property with placeholder URLs
      const propertyId = parseInt(selectedProperty);
      const property = this.properties.find(p => p.id === propertyId);
      
      if (property) {
        // Add placeholder gallery images
        const newGalleryImages = Array(this.selectedFiles.photos.length).fill('../wp-content/uploads/2025/02/unsplash.jpg');
        property.images.gallery = [...property.images.gallery, ...newGalleryImages];
        
        // Update in shared data manager
        if (window.sharedDataManager) {
          window.sharedDataManager.updateApartment(propertyId, {
            images: {
              main: property.images.main,
              gallery: property.images.gallery
            }
          });
        }
      }
      
      this.selectedFiles = { photos: [], videos: [] };
      this.updateFileDisplay();
      this.showNotification('Media uploaded successfully!', 'success');
    }, 2000);
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
  updateDashboard() {
    const totalProperties = this.properties.length;
    const forSaleCount = this.properties.filter(p => p.status === 'For Sale').length;
    const forRentCount = this.properties.filter(p => p.status === 'For Rent').length;
    const avgPrice = totalProperties > 0 ? this.properties.reduce((sum, p) => sum + p.price, 0) / totalProperties : 0;

    document.getElementById('total-properties').textContent = totalProperties;
    document.getElementById('for-sale-count').textContent = forSaleCount;
    document.getElementById('for-rent-count').textContent = forRentCount;
    document.getElementById('avg-price').textContent = ApartmentUtils.formatPrice(avgPrice, 'USD');
  }

  // Settings
  saveSettings() {
    const settings = {
      siteTitle: document.getElementById('site-title').value,
      contactEmail: document.getElementById('contact-email').value,
      contactPhone: document.getElementById('contact-phone').value
    };

    // In a real application, you would save to server
    localStorage.setItem('zentro-settings', JSON.stringify(settings));
    this.showNotification('Settings saved successfully!', 'success');
  }

  // Notifications
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-300 transform translate-x-full`;

    // Set background color based on type
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

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  window.zentroAdmin = new ZentroAdmin();
});