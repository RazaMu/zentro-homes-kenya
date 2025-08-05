// Apartment Details Page JavaScript
class ApartmentDetailsManager {
  constructor() {
    this.apartmentId = this.getApartmentIdFromUrl();
    this.apartment = null;
    this.currentImageIndex = 0;
    this.init();
  }

  init() {
    this.loadApartmentData();
    this.bindEvents();
  }

  getApartmentIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return parseInt(urlParams.get('id'));
  }

  // Wait for Railway data manager to be ready using event-based approach
  async waitForRailwayDataReady() {
    return new Promise((resolve) => {
      // Check if already ready
      if (window.sharedDataManager && window.sharedDataManager.isInitialized) {
        console.log('✅ Apartment Details: Railway data manager already ready');
        resolve(true);
        return;
      }

      // Set up timeout
      const timeout = setTimeout(() => {
        console.log('⚠️ Apartment Details: Timeout waiting for Railway data manager');
        resolve(false);
      }, 15000); // 15 second timeout

      // Listen for ready event
      const handleReady = (event) => {
        console.log('✅ Apartment Details: Railway data manager ready event received', event.detail);
        clearTimeout(timeout);
        window.removeEventListener('railwayDataManagerReady', handleReady);
        resolve(true);
      };

      window.addEventListener('railwayDataManagerReady', handleReady);
      
      // Also check periodically in case we missed the event
      const pollInterval = setInterval(() => {
        if (window.sharedDataManager && window.sharedDataManager.isInitialized) {
          console.log('✅ Apartment Details: Railway data manager ready via polling');
          clearTimeout(timeout);
          clearInterval(pollInterval);
          window.removeEventListener('railwayDataManagerReady', handleReady);
          resolve(true);
        }
      }, 500);

      // Clear polling if we get the event
      window.addEventListener('railwayDataManagerReady', () => {
        clearInterval(pollInterval);
      });
    });
  }

  async loadApartmentData() {
    try {
      console.log('🔍 ApartmentDetails: Loading apartment ID:', this.apartmentId);
      
      // Wait for Railway data manager to be ready using event-based approach
      const dataReady = await this.waitForRailwayDataReady();
      
      if (!dataReady) {
        console.error('❌ Railway data manager not ready, using fallback data');
        this.apartment = apartmentsData.apartments.find(apt => apt.id === this.apartmentId);
      } else {
        // Get all apartments from Railway
        const allApartments = await window.sharedDataManager.getAllApartments();
        console.log('🔢 Available apartment IDs from Railway:', allApartments.map(apt => ({ id: apt.id, title: apt.title })));
        console.log('🎯 Requested apartment ID:', this.apartmentId, typeof this.apartmentId);
        
        // Get apartment from Railway
        this.apartment = await window.sharedDataManager.getApartmentById(this.apartmentId);
        console.log('🏠 Loaded apartment from Railway:', this.apartment);
      }

      if (!this.apartment) {
        console.error('❌ Apartment not found with ID:', this.apartmentId);
        this.showNotFound();
        return;
      }

      console.log('✅ Apartment loaded successfully:', this.apartment.title);
      this.renderPropertyHeader();
      this.renderImageGallery();
      this.renderPropertyInfo();
      this.renderVideoPlayer();
      this.renderPropertyDetails();
      await this.renderSimilarProperties();
      this.updatePageTitle();
    } catch (error) {
      console.error('❌ Error loading apartment data:', error);
      this.showNotFound();
    }
  }

  showNotFound() {
    const propertyHeader = document.getElementById('property-header');
    const propertyGallery = document.getElementById('property-gallery');
    const propertyInfo = document.getElementById('property-info');
    const propertyDetailsGrid = document.getElementById('property-details-grid');
    const similarProperties = document.getElementById('similar-properties');

    // Clear all content containers
    if (propertyGallery) propertyGallery.innerHTML = '';
    if (propertyInfo) propertyInfo.innerHTML = '';
    if (propertyDetailsGrid) propertyDetailsGrid.innerHTML = '';
    if (similarProperties) similarProperties.innerHTML = '';

    // Show not found message
    if (propertyHeader) {
      propertyHeader.innerHTML = `
        <div class="not-found" style="text-align: center; padding: 60px 20px;">
          <h1 class="property-title" style="font-size: 32px; color: #2c2c2c; margin-bottom: 20px;">Property Not Found</h1>
          <p style="font-size: 18px; color: #666; margin-bottom: 32px; line-height: 1.5;">The property you're looking for doesn't exist or has been removed.</p>
          <a href="index.html" class="btn" style="display: inline-block; padding: 14px 28px; background: #bfa16b; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.3s ease;">Back to Properties</a>
        </div>
      `;
    }
  }

  updatePageTitle() {
    document.title = `${this.apartment.title} - ${this.apartment.location.area} | Zentro Homes`;
  }

  renderPropertyHeader() {
    const apartment = this.apartment;
    const headerContainer = document.getElementById('property-header');

    headerContainer.innerHTML = `
      <h1 class="property-title">${apartment.title}</h1>
      <div class="property-subtitle">
        <div class="property-location">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.58172 7.58172 1 12 1C16.4183 1 21 5.58172 21 10Z" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>${apartment.location.area}, ${apartment.location.city}, ${apartment.location.country}</span>
        </div>
        <div class="property-price">${this.formatCurrency(apartment.price, apartment.currency)}</div>
        <div class="property-status ${apartment.status.toLowerCase().replace(' ', '-')}">${apartment.status}</div>
      </div>
    `;
  }

  renderImageGallery() {
    const apartment = this.apartment;
    
    // Build image array from Railway API data structure with improved logic
    const allImages = [];
    
    // Add main image if available
    if (apartment.main_image) {
      const mainImageUrl = this.getImageUrl(apartment.main_image);
      if (mainImageUrl) {
        allImages.push(mainImageUrl);
      }
    }
    
    // Add gallery images from various possible sources
    if (apartment.media && apartment.media.images && apartment.media.images.length > 0) {
      apartment.media.images.forEach(image => {
        const imageUrl = this.getImageUrl(image);
        if (imageUrl && !allImages.includes(imageUrl)) {
          allImages.push(imageUrl);
        }
      });
    }
    
    // Add from direct images array if available (for legacy compatibility)
    if (apartment.images && Array.isArray(apartment.images) && apartment.images.length > 0) {
      apartment.images.forEach(image => {
        const imageUrl = this.getImageUrl(image);
        if (imageUrl && !allImages.includes(imageUrl)) {
          allImages.push(imageUrl);
        }
      });
    }
    
    // Add from gallery_images array if available (Railway API format)
    if (apartment.gallery_images && Array.isArray(apartment.gallery_images) && apartment.gallery_images.length > 0) {
      apartment.gallery_images.forEach(image => {
        const imageUrl = this.getImageUrl(image);
        if (imageUrl && !allImages.includes(imageUrl)) {
          allImages.push(imageUrl);
        }
      });
    }
    
    // Fallback image if no images found
    if (allImages.length === 0) {
      allImages.push('/uploads/placeholder.jpg');
    }
    
    console.log('🖼️ Apartment Details - Image gallery:', {
      apartment_id: apartment.id,
      main_image: apartment.main_image,
      media_images: apartment.media?.images,
      direct_images: apartment.images,
      gallery_images: apartment.gallery_images,
      final_images: allImages
    });
    
    const galleryContainer = document.getElementById('property-gallery');

    galleryContainer.innerHTML = `
      <div class="main-image-container">
        <img src="${allImages[0]}" alt="${apartment.title}" class="main-image" id="main-image">
        <div class="image-counter">
          <span id="current-image">1</span> / ${allImages.length}
        </div>
      </div>
      <div class="gallery-thumbnails">
        ${allImages.map((image, index) => `
          <img src="${image}" alt="${apartment.title} - Image ${index + 1}" 
               class="thumbnail ${index === 0 ? 'active' : ''}" 
               data-index="${index}">
        `).join('')}
      </div>
      
      <!-- Gallery Modal -->
      <div class="gallery-modal" id="gallery-modal">
        <div class="modal-content">
          <button class="modal-close" data-action="close">&times;</button>
          <button class="modal-nav modal-prev" data-action="prev">&#8249;</button>
          <img src="" alt="" class="modal-image" id="modal-image">
          <button class="modal-nav modal-next" data-action="next">&#8250;</button>
        </div>
      </div>
      
      <!-- Swipe indicator for touch devices -->
      <div class="swipe-indicator">Swipe to navigate</div>
    `;

    // Make main image clickable to open modal
    document.getElementById('main-image').addEventListener('click', () => {
      this.openModal();
    });

    // Add touch-specific attributes for better mobile experience
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      const mainImage = document.getElementById('main-image');
      if (mainImage) {
        mainImage.setAttribute('role', 'button');
        mainImage.setAttribute('aria-label', 'View image gallery');
        mainImage.setAttribute('tabindex', '0');
      }

      // Add touch feedback to thumbnails
      const thumbnails = document.querySelectorAll('.thumbnail');
      thumbnails.forEach(thumb => {
        thumb.setAttribute('role', 'button');
        thumb.setAttribute('aria-label', `View image ${parseInt(thumb.dataset.index) + 1}`);
        thumb.setAttribute('tabindex', '0');
      });
    }
  }

  renderPropertyInfo() {
    const apartment = this.apartment;
    const infoContainer = document.getElementById('property-info');

    // Clean and validate description
    const cleanDescription = apartment.description && apartment.description.length > 20 && 
                            !apartment.description.match(/^[a-z]{20,}$/i) ? 
                            apartment.description : 
                            "This beautiful property offers modern living with premium finishes and excellent amenities in a prime location.";

    infoContainer.innerHTML = `
      <div class="property-description">
        <p>${cleanDescription}</p>
      </div>
      
      <div class="property-features">
        <h3 class="features-title">Key Features</h3>
        <div class="features-grid">
          <div class="feature-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M20 21V9L12 2L4 9V21H8V14H16V21H20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 21V12H15V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${apartment.features.bedrooms} Bedrooms</span>
          </div>
          <div class="feature-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 19L20 12H4L12 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
              <path d="M12 1V5" stroke="currentColor" stroke-width="2"/>
              <path d="M12 15V19" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>${apartment.features.bathrooms} Bathrooms</span>
          </div>
          <div class="feature-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5C5.84 5 5.28 5.42 5.08 6.01L3 12V20C3 20.55 3.45 21 4 21H5C5.55 21 6 20.55 6 20V19H18V20C18 20.55 18.45 21 19 21H20C20.55 21 21 20.55 21 20V12L18.92 6.01Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="7.5" cy="15.5" r="1.5" stroke="currentColor" stroke-width="2"/>
              <circle cx="16.5" cy="15.5" r="1.5" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>${apartment.features.parking} Parking</span>
          </div>
          <div class="feature-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M21 16V8C21 6.9 20.1 6 19 6H5C3.9 6 3 6.9 3 8V16C3 17.1 3.9 18 5 18H19C20.1 18 21 17.1 21 16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 6V4C7 3.45 7.45 3 8 3H16C16.55 3 17 3.45 17 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 10H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 14H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${apartment.features.size}${apartment.features.sizeUnit}</span>
          </div>
        </div>
      </div>
      
      <div class="property-amenities">
        <h3 class="features-title">Amenities & Features</h3>
        <div class="amenities-list">
          ${apartment.amenities && apartment.amenities.length > 0 ? 
            apartment.amenities.map(amenity => `<span class="amenity-item">${amenity}</span>`).join('') :
            '<span class="amenity-item">Modern Kitchen</span><span class="amenity-item">Security</span><span class="amenity-item">Parking</span>'
          }
        </div>
      </div>
      
      <div class="contact-actions">
        <a href="#" class="contact-btn primary" data-action="schedule-visit">Schedule Viewing</a>
        <a href="contact-us/index.html" class="contact-btn secondary">Contact Agent</a>
        <a href="tel:+254706641871" class="contact-btn secondary">Call Now</a>
      </div>
    `;
  }

  renderVideoPlayer() {
    const apartment = this.apartment;
    const videoSection = document.getElementById('property-video-section');

    // Check if the property has a YouTube URL from various sources
    const youtubeUrl = apartment.youtubeUrl || apartment.media?.youtubeUrl || apartment.youtube_url;
    
    if (!youtubeUrl || youtubeUrl.trim() === '') {
      console.log('🎬 No YouTube URL found for apartment:', apartment.id);
      videoSection.classList.add('hidden');
      videoSection.style.display = 'none';
      return;
    }
    
    console.log('🎬 YouTube URL found:', youtubeUrl);

    // Show the video section
    videoSection.classList.remove('hidden');
    videoSection.style.display = 'block';

    // Extract YouTube video ID from the URL
    const youtubeId = this.extractYouTubeId(youtubeUrl);
    
    if (!youtubeId) {
      console.warn('Invalid YouTube URL:', youtubeUrl);
      videoSection.classList.add('hidden');
      videoSection.style.display = 'none';
      return;
    }

    // Create the YouTube embed HTML
    const videoPlayerHTML = `
      <div class="youtube-video-container">
        <div class="video-header">
          <h3 class="video-title">Property Video Tour</h3>
          <div class="video-subtitle">Take a virtual tour of this beautiful property</div>
        </div>
        <div class="youtube-embed-wrapper">
          <iframe 
            id="youtube-player"
            class="youtube-embed"
            src="https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&controls=1&showinfo=0&fs=1&cc_load_policy=0&iv_load_policy=3&autohide=1"
            title="Property Video Tour - ${apartment.title}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>
        </div>
        <div class="video-actions">
          <a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer" class="watch-on-youtube">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Watch on YouTube
          </a>
        </div>
      </div>
    `;

    // Set the HTML
    videoSection.innerHTML = videoPlayerHTML;

    // Initialize responsive YouTube embed
    this.initResponsiveYouTube();
  }

  // Extract YouTube video ID from various YouTube URL formats
  extractYouTubeId(url) {
    if (!url) return null;
    
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[7].length === 11) {
      return match[7];
    }
    
    // Handle YouTube Shorts URLs
    const shortsRegExp = /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/;
    const shortsMatch = url.match(shortsRegExp);
    
    if (shortsMatch && shortsMatch[1]) {
      return shortsMatch[1];
    }
    
    return null;
  }

  // Initialize responsive YouTube embed functionality
  initResponsiveYouTube() {
    const iframe = document.getElementById('youtube-player');
    if (!iframe) return;

    // Make YouTube embed responsive
    const wrapper = iframe.parentElement;
    if (wrapper) {
      wrapper.style.position = 'relative';
      wrapper.style.paddingBottom = '56.25%'; // 16:9 aspect ratio
      wrapper.style.height = '0';
      wrapper.style.overflow = 'hidden';
      
      iframe.style.position = 'absolute';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    }

    // Optional: Add loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'youtube-loading';
    loadingIndicator.innerHTML = `
      <div class="loading-spinner">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>Loading video...</span>
      </div>
    `;
    
    wrapper.appendChild(loadingIndicator);
    
    // Remove loading indicator when iframe loads
    iframe.addEventListener('load', () => {
      loadingIndicator.remove();
    });

    // Add error handling
    iframe.addEventListener('error', () => {
      wrapper.innerHTML = `
        <div class="youtube-error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Unable to load video</p>
          <a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer" class="retry-link">
            Watch on YouTube instead
          </a>
        </div>
      `;
    });
  }


  renderPropertyDetails() {
    const apartment = this.apartment;
    const detailsContainer = document.getElementById('property-details-grid');

    detailsContainer.innerHTML = `
      <div class="detail-card">
        <h3>Property Details</h3>
        <ul class="detail-list">
          <li><span class="detail-label">Property Type</span><span class="detail-value">${apartment.type}</span></li>
          <li><span class="detail-label">Status</span><span class="detail-value">${apartment.status}</span></li>
          <li><span class="detail-label">Year Built</span><span class="detail-value">${apartment.yearBuilt}</span></li>
          <li><span class="detail-label">Furnished</span><span class="detail-value">${apartment.furnished ? 'Yes' : 'No'}</span></li>
          <li><span class="detail-label">Available</span><span class="detail-value">${apartment.available ? 'Yes' : 'No'}</span></li>
          <li><span class="detail-label">Date Added</span><span class="detail-value">${new Date(apartment.dateAdded).toLocaleDateString()}</span></li>
        </ul>
      </div>
      
      <div class="detail-card">
        <h3>Location Information</h3>
        <ul class="detail-list">
          <li><span class="detail-label">Area</span><span class="detail-value">${apartment.location.area}</span></li>
          <li><span class="detail-label">City</span><span class="detail-value">${apartment.location.city}</span></li>
          <li><span class="detail-label">Country</span><span class="detail-value">${apartment.location.country}</span></li>
        </ul>
      </div>
      
      <div class="detail-card">
        <h3>Financial Information</h3>
        <ul class="detail-list">
          <li><span class="detail-label">Price</span><span class="detail-value">${ApartmentUtils.formatPrice(apartment.price, apartment.currency)}</span></li>
          <li><span class="detail-label">Currency</span><span class="detail-value">${apartment.currency}</span></li>
          <li><span class="detail-label">Price per ${apartment.features.sizeUnit}</span><span class="detail-value">${ApartmentUtils.formatPrice(Math.round(apartment.price / apartment.features.size), apartment.currency)}</span></li>
        </ul>
      </div>
    `;
  }

  async renderSimilarProperties() {
    const apartment = this.apartment;
    let similarProperties = [];

    try {
      // Try to get properties from database first
      if (window.sharedDataManager) {
        const allApartments = await window.sharedDataManager.getAllApartments();
        console.log('🔍 Looking for similar properties from database...');
        
        // Filter for available properties in the same area, excluding current apartment
        similarProperties = allApartments
          .filter(apt => 
            apt.id !== apartment.id && 
            apt.available === true && 
            apt.location && 
            apt.location.area === apartment.location.area
          )
          .slice(0, 3);

        // If not enough properties in same area, get available properties from same city
        if (similarProperties.length < 3) {
          const cityProperties = allApartments
            .filter(apt => 
              apt.id !== apartment.id && 
              apt.available === true && 
              apt.location && 
              apt.location.city === apartment.location.city &&
              apt.location.area !== apartment.location.area
            )
            .slice(0, 3 - similarProperties.length);
          
          similarProperties.push(...cityProperties);
        }

        // If still not enough, get any available properties
        if (similarProperties.length < 3) {
          const otherProperties = allApartments
            .filter(apt => 
              apt.id !== apartment.id && 
              apt.available === true &&
              !similarProperties.some(sp => sp.id === apt.id)
            )
            .slice(0, 3 - similarProperties.length);
          
          similarProperties.push(...otherProperties);
        }

        console.log(`✅ Found ${similarProperties.length} similar available properties from database`);
      } else {
        console.log('⚠️ Database not available, using fallback data');
        // Fallback to static data
        similarProperties = apartmentsData.apartments
          .filter(apt => apt.id !== apartment.id && apt.available !== false && apt.location.area === apartment.location.area)
          .slice(0, 3);

        if (similarProperties.length === 0) {
          const otherProperties = apartmentsData.apartments.filter(apt => apt.id !== apartment.id && apt.available !== false);
          similarProperties.push(...otherProperties.slice(0, 3));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching similar properties:', error);
      // Fallback to static data
      similarProperties = apartmentsData.apartments
        .filter(apt => apt.id !== apartment.id && apt.available !== false && apt.location.area === apartment.location.area)
        .slice(0, 3);

      if (similarProperties.length === 0) {
        const otherProperties = apartmentsData.apartments.filter(apt => apt.id !== apartment.id && apt.available !== false);
        similarProperties.push(...otherProperties.slice(0, 3));
      }
    }

    const similarContainer = document.getElementById('similar-properties-grid');

    if (similarProperties.length === 0) {
      similarContainer.innerHTML = `
        <div class="no-similar-properties" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
          <p>No similar properties currently available.</p>
          <a href="index.html#featured-apartments" class="btn" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #bfa16b; color: #fff; text-decoration: none; border-radius: 8px;">View All Properties</a>
        </div>
      `;
      return;
    }

    similarContainer.innerHTML = similarProperties.map(similar => {
      // Use unified image processing for similar properties too
      const similarImageUrl = this.getImageUrl(similar.main_image) || 
                             this.getImageUrl(similar.media?.images?.[0]) || 
                             this.getImageUrl(similar.images?.[0]) || 
                             this.getImageUrl(similar.images?.main) || 
                             '/uploads/placeholder.jpg';
      
      return `
      <div class="similar-property-card" data-property-id="${similar.id}">
        <img src="${similarImageUrl}" alt="${similar.title}" class="similar-property-image">
        <div class="similar-property-content">
          <h4 class="similar-property-title">${similar.title}</h4>
          <div class="similar-property-location">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.58172 7.58172 1 12 1C16.4183 1 21 5.58172 21 10Z" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>${similar.location?.area || 'Location'}, ${similar.location?.city || 'City'}</span>
          </div>
          <div class="similar-property-price">${this.formatCurrency(similar.price, similar.currency)}</div>
          <div class="similar-property-status" style="margin-top: 8px; font-size: 12px; color: #4CAF50; font-weight: 600;">
            ✓ Available
          </div>
        </div>
      </div>
    }).join('');
  }

  changeMainImage(index) {
    const apartment = this.apartment;
    const allImages = [apartment.images.main, ...apartment.images.gallery];
    const mainImage = document.getElementById('main-image');
    const currentImageSpan = document.getElementById('current-image');

    // Update main image
    mainImage.src = allImages[index];
    this.currentImageIndex = index;

    // Update counter
    currentImageSpan.textContent = index + 1;

    // Update thumbnail active state
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  }

  openModal() {
    const modal = document.getElementById('gallery-modal');
    const modalImage = document.getElementById('modal-image');
    const apartment = this.apartment;
    const allImages = [apartment.images.main, ...apartment.images.gallery];

    modalImage.src = allImages[this.currentImageIndex];
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    const modal = document.getElementById('gallery-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  prevImage() {
    const apartment = this.apartment;
    const allImages = [apartment.images.main, ...apartment.images.gallery];
    this.currentImageIndex = (this.currentImageIndex - 1 + allImages.length) % allImages.length;
    this.updateModalImage();
    this.changeMainImage(this.currentImageIndex);
  }

  nextImage() {
    const apartment = this.apartment;
    const allImages = [apartment.images.main, ...apartment.images.gallery];
    this.currentImageIndex = (this.currentImageIndex + 1) % allImages.length;
    this.updateModalImage();
    this.changeMainImage(this.currentImageIndex);
  }

  updateModalImage() {
    const apartment = this.apartment;
    const allImages = [apartment.images.main, ...apartment.images.gallery];
    const modalImage = document.getElementById('modal-image');
    modalImage.src = allImages[this.currentImageIndex];
  }

  scheduleVisit() {
    // Scroll to contact section or show booking form
    const ctaSection = document.querySelector('.cta_section');
    if (ctaSection) {
      ctaSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert('Interested in scheduling a visit to ' + this.apartment.title + '? Please contact us at +254706641871 or through our contact form.');
    }
  }

  viewProperty(id) {
    window.location.href = `apartment-details.html?id=${id}`;
  }

  bindEvents() {
    // Keyboard navigation for modal
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('gallery-modal');
      if (modal && modal.classList.contains('active')) {
        switch (e.key) {
          case 'Escape':
            this.closeModal();
            break;
          case 'ArrowLeft':
            this.prevImage();
            break;
          case 'ArrowRight':
            this.nextImage();
            break;
        }
      }
    });

    // Close modal when clicking outside
    document.getElementById('gallery-modal')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('gallery-modal')) {
        this.closeModal();
      }
    });

    // Add touch swipe gestures for gallery
    this.addTouchGestures();
  }

  addTouchGestures() {
    // Add swipe gestures for main image
    const mainImage = document.getElementById('main-image');
    if (mainImage) {
      let touchStartX = 0;
      let touchEndX = 0;
      let touchStartY = 0;
      let touchEndY = 0;
      let startTime = 0;

      mainImage.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        startTime = new Date().getTime();
      }, { passive: true });

      mainImage.addEventListener('touchmove', (e) => {
        const currentX = e.changedTouches[0].screenX;
        const swipeDistance = currentX - touchStartX;

        // Add visual feedback during swipe if significant horizontal movement
        if (Math.abs(swipeDistance) > 30) {
          const direction = swipeDistance > 0 ? 'right' : 'left';
          mainImage.parentElement.setAttribute('data-swipe-direction', direction);
        }
      }, { passive: true });

      mainImage.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        const endTime = new Date().getTime();
        const touchDuration = endTime - startTime;

        // Remove visual feedback
        mainImage.parentElement.removeAttribute('data-swipe-direction');

        this.handleSwipe(touchStartX, touchEndX, touchStartY, touchEndY, touchDuration);
      }, { passive: true });
    }

    // Add swipe gestures for modal
    const modalImage = document.getElementById('modal-image');
    if (modalImage) {
      let touchStartX = 0;
      let touchEndX = 0;
      let touchStartY = 0;
      let touchEndY = 0;
      let startTime = 0;

      modalImage.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        startTime = new Date().getTime();
      }, { passive: true });

      modalImage.addEventListener('touchmove', (e) => {
        const currentX = e.changedTouches[0].screenX;
        const swipeDistance = currentX - touchStartX;

        // Add visual feedback during swipe if significant horizontal movement
        if (Math.abs(swipeDistance) > 30) {
          const direction = swipeDistance > 0 ? 'right' : 'left';
          modalImage.parentElement.setAttribute('data-swipe-direction', direction);
        }
      }, { passive: true });

      modalImage.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        const endTime = new Date().getTime();
        const touchDuration = endTime - startTime;

        // Remove visual feedback
        modalImage.parentElement.removeAttribute('data-swipe-direction');

        this.handleSwipe(touchStartX, touchEndX, touchStartY, touchEndY, touchDuration);
      }, { passive: true });
    }

    // Add swipe gestures for similar properties
    const similarPropertiesGrid = document.getElementById('similar-properties-grid');
    if (similarPropertiesGrid) {
      let touchStartX = 0;
      let touchEndX = 0;
      let touchStartY = 0;
      let touchEndY = 0;
      let startTime = 0;
      let scrollStartPosition = 0;
      let isSwiping = false;

      // Add snap scrolling for better touch experience
      similarPropertiesGrid.style.scrollSnapType = 'x mandatory';

      // Add snap align to carousel items
      const items = similarPropertiesGrid.querySelectorAll('.similar-property-card');
      items.forEach(item => {
        item.style.scrollSnapAlign = 'center';
      });

      similarPropertiesGrid.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        startTime = new Date().getTime();
        scrollStartPosition = similarPropertiesGrid.scrollLeft;
        isSwiping = true;
      }, { passive: true });

      similarPropertiesGrid.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;

        const currentX = e.changedTouches[0].screenX;
        const currentY = e.changedTouches[0].screenY;
        const deltaX = touchStartX - currentX;
        const deltaY = Math.abs(touchStartY - currentY);

        // If primarily vertical scrolling, don't interfere
        if (deltaY > Math.abs(deltaX) * 1.5) {
          isSwiping = false;
          return;
        }

        // Add resistance at the edges
        if ((scrollStartPosition <= 0 && deltaX < 0) ||
          (scrollStartPosition >= similarPropertiesGrid.scrollWidth - similarPropertiesGrid.clientWidth && deltaX > 0)) {
          // Apply resistance at the edges
          similarPropertiesGrid.scrollLeft = scrollStartPosition + (deltaX * 0.3);
        } else {
          similarPropertiesGrid.scrollLeft = scrollStartPosition + deltaX;
        }
      }, { passive: true });

      similarPropertiesGrid.addEventListener('touchend', (e) => {
        if (!isSwiping) return;

        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        const endTime = new Date().getTime();
        const timeElapsed = endTime - startTime;

        this.handleCarouselSwipe(similarPropertiesGrid, touchStartX, touchEndX, touchStartY, touchEndY, timeElapsed, scrollStartPosition);
        isSwiping = false;
      }, { passive: true });
    }

  }

  handleSwipe(touchStartX, touchEndX, touchStartY, touchEndY, touchDuration) {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    const verticalDistance = Math.abs(touchEndY - touchStartY);

    // Only process if it's a significant horizontal swipe and not primarily vertical
    if (Math.abs(swipeDistance) < swipeThreshold || verticalDistance > Math.abs(swipeDistance) * 1.5) return;

    // Add haptic feedback if available
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }

    if (swipeDistance < 0) {
      // Swipe left - next image
      this.nextImage();
      this.showSwipeIndicator('next');
    } else {
      // Swipe right - previous image
      this.prevImage();
      this.showSwipeIndicator('prev');
    }
  }

  handleCarouselSwipe(carousel, touchStartX, touchEndX, touchStartY, touchEndY, timeElapsed, scrollStartPosition) {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    const verticalDistance = Math.abs(touchEndY - touchStartY);

    // Only process if it's a significant horizontal swipe and not primarily vertical
    if (Math.abs(swipeDistance) < swipeThreshold || verticalDistance > Math.abs(swipeDistance) * 1.5) {
      // Snap to the nearest item
      this.snapToNearestItem(carousel);
      return;
    }

    // Calculate momentum scrolling
    if (timeElapsed < 300) {
      // Fast swipe - add momentum
      const momentum = swipeDistance * 3;
      const targetScroll = scrollStartPosition - momentum;

      // Smooth scroll to the target position
      carousel.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });

      // After momentum scrolling, snap to nearest item
      setTimeout(() => {
        this.snapToNearestItem(carousel);
      }, 300);
    } else {
      // Slow swipe - just snap to nearest item
      this.snapToNearestItem(carousel);
    }

    // Add haptic feedback if available
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(30);
    }
  }

  snapToNearestItem(carousel) {
    const items = carousel.querySelectorAll('.similar-property-card');
    if (!items.length) return;

    let minDistance = Infinity;
    let targetItem = null;
    const carouselLeft = carousel.scrollLeft;
    const carouselCenter = carouselLeft + (carousel.offsetWidth / 2);

    items.forEach(item => {
      const itemLeft = item.offsetLeft;
      const itemCenter = itemLeft + (item.offsetWidth / 2);
      const distance = Math.abs(carouselCenter - itemCenter);

      if (distance < minDistance) {
        minDistance = distance;
        targetItem = item;
      }
    });

    if (targetItem) {
      const targetLeft = targetItem.offsetLeft - ((carousel.offsetWidth - targetItem.offsetWidth) / 2);
      carousel.scrollTo({
        left: targetLeft,
        behavior: 'smooth'
      });
    }
  }


  showSwipeIndicator(direction) {
    // Remove any existing indicators
    const existingIndicator = document.querySelector('.swipe-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create new indicator
    const indicator = document.createElement('div');
    indicator.className = 'swipe-indicator';

    if (direction === 'next') {
      indicator.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
        <span>Next</span>
      `;
    } else if (direction === 'prev') {
      indicator.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        <span>Previous</span>
      `;
    }

    // Add to gallery container
    const galleryContainer = document.querySelector('.property-gallery');
    if (galleryContainer) {
      galleryContainer.appendChild(indicator);

      // Remove after animation
      setTimeout(() => {
        indicator.classList.add('fade-out');
        setTimeout(() => {
          indicator.remove();
        }, 500);
      }, 1000);
    }
  }

  getImageUrl(imageData) {
    // Use the unified image URL processing from Railway Data Manager
    if (window.sharedDataManager && window.sharedDataManager.getImageUrl) {
      return window.sharedDataManager.getImageUrl(imageData);
    }
    
    // Fallback implementation if Railway Data Manager not available
    if (!imageData) return null;
    
    // If Railway client is available, use its image URL helper
    if (window.railwayClient && window.railwayClient.getImageUrl) {
      return window.railwayClient.getImageUrl(imageData);
    }
    
    // Handle array of images - get first image
    if (Array.isArray(imageData) && imageData.length > 0) {
      return this.getImageUrl(imageData[0]);
    }
    
    // Handle string URLs
    if (typeof imageData === 'string') {
      // Railway Volume Storage URLs - convert to full URL
      if (imageData.startsWith('/uploads/')) {
        return window.location.origin + imageData;
      }
      // Already a full URL or relative path
      return imageData;
    }
    
    // Handle object with url property
    if (imageData && imageData.url) {
      if (imageData.url.startsWith('/uploads/')) {
        return window.location.origin + imageData.url;
      }
      return imageData.url;
    }
    
    // Handle Railway API format with file path
    if (imageData && imageData.path) {
      if (imageData.path.startsWith('/uploads/')) {
        return window.location.origin + imageData.path;
      }
      return imageData.path;
    }
    
    return null;
  }

  formatCurrency(price, currency = 'KES') {
    const formattedNumber = new Intl.NumberFormat('en-KE').format(price);
    return `${currency} ${formattedNumber}`;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  if (window.location.pathname.includes('apartment-details')) {
    window.apartmentDetails = new ApartmentDetailsManager();
  }
});