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

  async waitForRailwayDataReady() {
    return new Promise((resolve) => {
      if (window.sharedDataManager && window.sharedDataManager.isInitialized) {
        console.log('✅ Apartment Details: Railway data manager already ready');
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        console.log('⚠️ Apartment Details: Timeout waiting for Railway data manager');
        resolve(false);
      }, 30000); // Increased timeout to 30 seconds

      const handleReady = (event) => {
        console.log('✅ Apartment Details: Railway data manager ready event received', event.detail);
        clearTimeout(timeout);
        window.removeEventListener('railwayDataManagerReady', handleReady);
        resolve(true);
      };

      window.addEventListener('railwayDataManagerReady', handleReady);
      
      const pollInterval = setInterval(() => {
        if (window.sharedDataManager && window.sharedDataManager.isInitialized) {
          console.log('✅ Apartment Details: Railway data manager ready via polling');
          clearTimeout(timeout);
          clearInterval(pollInterval);
          window.removeEventListener('railwayDataManagerReady', handleReady);
          resolve(true);
        }
      }, 500);

      window.addEventListener('railwayDataManagerReady', () => {
        clearInterval(pollInterval);
      });
    });
  }

  async loadApartmentData() {
    try {
      console.log('🔍 ApartmentDetails: Loading apartment ID:', this.apartmentId);
      
      // Always wait for Railway data manager since it has the actual data
      const dataReady = await this.waitForRailwayDataReady();
      
      if (dataReady && window.sharedDataManager) {
        const allApartments = await window.sharedDataManager.getAllApartments();
        console.log('🔢 Available apartment IDs from Railway:', allApartments.map(apt => ({ id: apt.id, title: apt.title })));
        console.log('🎯 Requested apartment ID:', this.apartmentId, typeof this.apartmentId);
        
        this.apartment = await window.sharedDataManager.getApartmentById(this.apartmentId);
        console.log('🏠 Loaded apartment from Railway:', this.apartment);
      } else {
        console.error('❌ Railway data manager not ready, cannot load apartment data');
        this.showNotFound();
        return;
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

    if (propertyGallery) propertyGallery.innerHTML = '';
    if (propertyInfo) propertyInfo.innerHTML = '';
    if (propertyDetailsGrid) propertyDetailsGrid.innerHTML = '';
    if (similarProperties) similarProperties.innerHTML = '';

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

  async renderImageGallery() {
    const apartment = this.apartment;
    const allImages = await this.discoverLocalImages(apartment.id);
    
    if (allImages.length === 0) {
      allImages.push('/uploads/placeholder.jpg');
      console.log(`⚠️ No local images found for property ${apartment.id}, using placeholder`);
    }
    
    console.log('🖼️ Apartment Details - Local image gallery:', {
      apartment_id: apartment.id,
      total_local_images: allImages.length,
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
      
      <div class="gallery-modal" id="gallery-modal">
        <div class="modal-content">
          <button class="modal-close" data-action="close">&times;</button>
          <button class="modal-nav modal-prev" data-action="prev">&#8249;</button>
          <img src="" alt="" class="modal-image" id="modal-image">
          <button class="modal-nav modal-next" data-action="next">&#8250;</button>
        </div>
      </div>
      
      <div class="swipe-indicator">Swipe to navigate</div>
    `;

    this.currentGalleryImages = allImages;

    // Check if device is mobile
    const isMobile = window.innerWidth <= 767 || ('ontouchstart' in window && navigator.maxTouchPoints > 0);

    // Only add click events on desktop
    if (!isMobile) {
      document.querySelectorAll('.thumbnail').forEach((thumbnail, index) => {
        thumbnail.addEventListener('click', () => {
          this.changeMainImageByIndex(index);
        });
      });

      document.getElementById('main-image').addEventListener('click', () => {
        this.openModal();
      });
    }

    // Handle mobile touch accessibility and prevent click events on mobile
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      const mainImage = document.getElementById('main-image');
      if (mainImage) {
        // On mobile, only enable swipe functionality
        if (isMobile) {
          // Prevent click events on mobile but allow touch for swipe
          mainImage.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }, { passive: false });
          
          mainImage.setAttribute('aria-label', 'Swipe to navigate gallery');
        } else {
          // Desktop: enable click functionality
          mainImage.setAttribute('role', 'button');
          mainImage.setAttribute('aria-label', 'View image gallery');
          mainImage.setAttribute('tabindex', '0');
        }
      }

      const thumbnails = document.querySelectorAll('.thumbnail');
      thumbnails.forEach((thumb, index) => {
        if (isMobile) {
          // Prevent click events on mobile thumbnails
          thumb.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }, { passive: false });
        } else {
          // Only add accessibility for desktop
          thumb.setAttribute('role', 'button');
          thumb.setAttribute('aria-label', `View image ${parseInt(thumb.dataset.index) + 1}`);
          thumb.setAttribute('tabindex', '0');
        }
      });
    }
  }

  async discoverLocalImages(propertyId) {
    const localImages = [];
    const maxImages = 20;
    
    console.log(`🔍 Apartment Details - Discovering local images for property ${propertyId}`);
    
    for (let i = 1; i <= maxImages; i++) {
      const imageUrl = this.getImageUrl(null, propertyId, i - 1);
      
      try {
        const imageExists = await this.checkImageExists(imageUrl);
        if (imageExists) {
          localImages.push(imageUrl);
          console.log(`✅ Found local image: Img_${i}.jpg`);
        } else {
          if (i === 1) {
            break;
          }
          let gapCount = 0;
          for (let j = i; j <= i + 2 && j <= maxImages; j++) {
            const nextImageUrl = this.getImageUrl(null, propertyId, j - 1);
            const nextExists = await this.checkImageExists(nextImageUrl);
            if (!nextExists) {
              gapCount++;
            } else {
              localImages.push(nextImageUrl);
              console.log(`✅ Found local image: Img_${j}.jpg`);
              i = j;
              break;
            }
          }
          if (gapCount >= 3) {
            break;
          }
        }
      } catch (error) {
        console.log(`❌ Error checking image Img_${i}.jpg:`, error);
        break;
      }
    }
    
    console.log(`🎯 Discovered ${localImages.length} local images for property ${propertyId}`);
    return localImages;
  }

  checkImageExists(imageUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 3000);
      img.src = imageUrl;
    });
  }

  changeMainImageByIndex(index) {
    if (!this.currentGalleryImages || index >= this.currentGalleryImages.length) return;
    
    const mainImage = document.getElementById('main-image');
    const currentImageSpan = document.getElementById('current-image');

    mainImage.src = this.currentGalleryImages[index];
    this.currentImageIndex = index;

    currentImageSpan.textContent = index + 1;

    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  }

  renderPropertyInfo() {
    const apartment = this.apartment;
    const infoContainer = document.getElementById('property-info');

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

    const youtubeUrl = apartment.youtubeUrl || apartment.media?.youtubeUrl || apartment.youtube_url;
    
    if (!youtubeUrl || youtubeUrl.trim() === '') {
      console.log('🎬 No YouTube URL found for apartment:', apartment.id);
      videoSection.classList.add('hidden');
      videoSection.style.display = 'none';
      return;
    }
    
    console.log('🎬 YouTube URL found:', youtubeUrl);

    videoSection.classList.remove('hidden');
    videoSection.style.display = 'block';

    const youtubeId = this.extractYouTubeId(youtubeUrl);
    
    if (!youtubeId) {
      console.warn('Invalid YouTube URL:', youtubeUrl);
      videoSection.classList.add('hidden');
      videoSection.style.display = 'none';
      return;
    }

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

    videoSection.innerHTML = videoPlayerHTML;
    this.initResponsiveYouTube();
  }

  extractYouTubeId(url) {
    if (!url) return null;
    
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[7].length === 11) {
      return match[7];
    }
    
    const shortsRegExp = /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/;
    const shortsMatch = url.match(shortsRegExp);
    
    if (shortsMatch && shortsMatch[1]) {
      return shortsMatch[1];
    }
    
    return null;
  }

  initResponsiveYouTube() {
    const iframe = document.getElementById('youtube-player');
    if (!iframe) return;

    const wrapper = iframe.parentElement;
    if (wrapper) {
      wrapper.style.position = 'relative';
      wrapper.style.paddingBottom = '56.25%';
      wrapper.style.height = '0';
      wrapper.style.overflow = 'hidden';
      
      iframe.style.position = 'absolute';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    }

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
    
    iframe.addEventListener('load', () => {
      loadingIndicator.remove();
    });

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
      if (window.sharedDataManager) {
        const allApartments = await window.sharedDataManager.getAllApartments();
        console.log('🔍 Looking for similar properties from database...');
        
        similarProperties = allApartments
          .filter(apt => 
            apt.id !== apartment.id && 
            apt.available === true && 
            apt.location && 
            apt.location.area === apartment.location.area
          )
          .slice(0, 3);

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
      }
    } catch (error) {
      console.error('❌ Error fetching similar properties:', error);
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
      const similarImageUrl = this.getImageUrl(null, similar.id, 0) || '/uploads/placeholder.jpg';
      
      console.log(`🖼️ Similar Property ${similar.id} - Using local thumbnail: ${similarImageUrl}`);
      
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
    `;
    }).join('');
  }

  changeMainImage(index) {
    this.changeMainImageByIndex(index);
  }

  openModal() {
    const modal = document.getElementById('gallery-modal');
    const modalImage = document.getElementById('modal-image');

    if (this.currentGalleryImages && this.currentGalleryImages[this.currentImageIndex]) {
      modalImage.src = this.currentGalleryImages[this.currentImageIndex];
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    const modal = document.getElementById('gallery-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  prevImage() {
    if (!this.currentGalleryImages || this.currentGalleryImages.length === 0) return;
    
    this.currentImageIndex = (this.currentImageIndex - 1 + this.currentGalleryImages.length) % this.currentGalleryImages.length;
    this.updateModalImage();
    this.changeMainImageByIndex(this.currentImageIndex);
  }

  nextImage() {
    if (!this.currentGalleryImages || this.currentGalleryImages.length === 0) return;
    
    this.currentImageIndex = (this.currentImageIndex + 1) % this.currentGalleryImages.length;
    this.updateModalImage();
    this.changeMainImageByIndex(this.currentImageIndex);
  }

  updateModalImage() {
    const modalImage = document.getElementById('modal-image');
    if (this.currentGalleryImages && this.currentGalleryImages[this.currentImageIndex]) {
      modalImage.src = this.currentGalleryImages[this.currentImageIndex];
    }
  }

  scheduleVisit() {
    const ctaSection = document.querySelector('.cta_section');
    if (ctaSection) {
      ctaSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert("Interested in scheduling a visit to " + this.apartment.title + "? Please contact us at +254706641871 or through our contact form.");
    }
  }

  viewProperty(id) {
    window.location.href = `apartment-details.html?id=${id}`;
  }

  bindEvents() {
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

    document.getElementById('gallery-modal')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('gallery-modal')) {
        this.closeModal();
      }
    });

    this.addTouchGestures();
  }

  addTouchGestures() {
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

        mainImage.parentElement.removeAttribute('data-swipe-direction');

        this.handleSwipe(touchStartX, touchEndX, touchStartY, touchEndY, touchDuration);
      }, { passive: true });
    }

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

        modalImage.parentElement.removeAttribute('data-swipe-direction');

        this.handleSwipe(touchStartX, touchEndX, touchStartY, touchEndY, touchDuration);
      }, { passive: true });
    }
  }

  handleSwipe(touchStartX, touchEndX, touchStartY, touchEndY, touchDuration) {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    const verticalDistance = Math.abs(touchEndY - touchStartY);

    if (Math.abs(swipeDistance) < swipeThreshold || verticalDistance > Math.abs(swipeDistance) * 1.5) return;

    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }

    if (swipeDistance < 0) {
      this.nextImage();
    } else {
      this.prevImage();
    }
  }

  getImageUrl(imageData, propertyId = null, imageIndex = null) {
    if (propertyId && imageIndex !== null) {
      const localImagePath = `/uploads/${propertyId}/Img_${imageIndex + 1}.jpg`;
      console.log(`🔍 Apartment Details getImageUrl: Using local storage path for property ${propertyId}, image ${imageIndex + 1}: ${localImagePath}`);
      return window.location.origin + localImagePath;
    }
    
    if (imageData && typeof imageData === 'string' && imageData.includes('/uploads/') && imageData.includes('Img_')) {
      console.log(`🔍 Apartment Details getImageUrl: Found local Img_X path: ${imageData}`);
      if (!imageData.startsWith('http')) {
        return window.location.origin + imageData;
      }
      return imageData;
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
    // Add a small delay to ensure all scripts are loaded
    setTimeout(() => {
      window.apartmentDetails = new ApartmentDetailsManager();
    }, 100);
  }
});

// Event delegation for similar property cards
document.addEventListener('click', function(e) {
  const propertyCard = e.target.closest('.similar-property-card');
  if (propertyCard) {
    const propertyId = propertyCard.dataset.propertyId;
    if (propertyId && window.apartmentDetails) {
      window.apartmentDetails.viewProperty(propertyId);
    }
  }
  
  if (e.target.matches('[data-action="schedule-visit"]')) {
    e.preventDefault();
    if (window.apartmentDetails) {
      window.apartmentDetails.scheduleVisit();
    }
  }
  
  if (e.target.matches('[data-action="close"]')) {
    if (window.apartmentDetails) {
      window.apartmentDetails.closeModal();
    }
  }
  
  if (e.target.matches('[data-action="prev"]')) {
    if (window.apartmentDetails) {
      window.apartmentDetails.prevImage();
    }
  }
  
  if (e.target.matches('[data-action="next"]')) {
    if (window.apartmentDetails) {
      window.apartmentDetails.nextImage();
    }
  }
});