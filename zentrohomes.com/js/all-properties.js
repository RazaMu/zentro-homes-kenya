// All Properties Page JavaScript Implementation
class AllPropertiesManager {
    constructor() {
        this.apartments = [];
        this.filteredApartments = [];
        this.displayedApartments = [];
        this.currentFilters = { status: 'For Sale' }; // Default to For Sale
        this.currentSort = 'newest';
        this.isLoading = true;
        this.itemsPerPage = 12;
        this.currentPage = 1;
        this.totalPages = 1;

        this.init();
    }

    async init() {
        this.showLoadingState();
        await this.loadApartments();
        this.renderSearchAndFilters();
        this.renderApartments();
        this.bindTabEvents();
        this.bindSearchFieldEvents();
        this.bindCardEvents();
    }

    // Simplified Railway data manager detection
    async waitForRailwayDataReady() {
        return new Promise((resolve) => {
            // Check if already ready
            if (window.sharedDataManager && window.sharedDataManager.isInitialized) {
                console.log('✅ All Properties: Railway data manager already ready');
                resolve(true);
                return;
            }

            // Listen for ready event (no timeout, wait for actual completion)
            const handleReady = (event) => {
                console.log('✅ All Properties: Railway data manager ready event received', event.detail);
                window.removeEventListener('railwayDataManagerReady', handleReady);
                resolve(true);
            };

            window.addEventListener('railwayDataManagerReady', handleReady);
            
            // Also poll every 200ms for faster detection
            const pollInterval = setInterval(() => {
                if (window.sharedDataManager && window.sharedDataManager.isInitialized) {
                    console.log('✅ All Properties: Railway data manager ready via polling');
                    clearInterval(pollInterval);
                    window.removeEventListener('railwayDataManagerReady', handleReady);
                    resolve(true);
                }
            }, 200);

            // Clear polling if we get the event
            window.addEventListener('railwayDataManagerReady', () => {
                clearInterval(pollInterval);
            });
        });
    }

    async loadApartments() {
        try {
            console.log('🕐 All Properties: Starting to load apartments...');
            
            // Always wait for Railway data manager to be ready (no timeout)
            await this.waitForRailwayDataReady();

            // Get all apartments from Railway
            this.apartments = await window.sharedDataManager.getAllApartments();
            
            // If no apartments loaded from Railway, use fallback data as last resort
            if (!this.apartments || this.apartments.length === 0) {
                console.log('⚠️ No apartments from Railway, using fallback data');
                this.apartments = this.createFallbackData();
            }
            
            this.filteredApartments = [...this.apartments];
            this.isLoading = false;
            this.updatePagination();
            
            // Apply initial filter (For Sale by default)
            this.applyFilters();
            
            console.log(`📦 All Properties: ${this.apartments.length} apartments ready for display`);
        } catch (error) {
            console.error('❌ Error loading apartments:', error);
            // Fallback to static data
            this.apartments = [...apartmentsData.apartments];
            this.filteredApartments = [...this.apartments];
            this.isLoading = false;
            this.updatePagination();
            
            // Apply initial filter (For Sale by default)
            this.applyFilters();
            
            console.log('⚠️ All Properties: Using fallback static data due to error');
            console.log(`📊 Fallback Property statuses:`, this.apartments.map(apt => `${apt.title}: ${apt.status}`));
        }
    }

    showLoadingState() {
        const loadingElement = document.getElementById('loading-state');
        const apartmentsContainer = document.getElementById('apartments-grid');
        
        if (loadingElement) loadingElement.style.display = 'flex';
        if (apartmentsContainer) apartmentsContainer.innerHTML = '';
    }

    hideLoadingState() {
        const loadingElement = document.getElementById('loading-state');
        if (loadingElement) loadingElement.style.display = 'none';
    }

    renderSearchAndFilters() {
        // Property search tabs
        this.bindTabEvents();
        
        // Initialize search dropdowns
        this.initializeSearchDropdowns();
        
        // Bind search field events
        this.bindSearchFieldEvents();
    }

    renderApartments() {
        this.hideLoadingState();
        
        const apartmentsContainer = document.getElementById('apartments-grid');
        const resultsCount = document.getElementById('results-count');
        const noResults = document.getElementById('no-results');
        const loadMoreContainer = document.getElementById('load-more-container');
        
        if (!apartmentsContainer) return;

        // Update results count
        this.updateResultsCount();

        // Get apartments for current page
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        this.displayedApartments = this.filteredApartments.slice(0, endIndex);

        if (this.displayedApartments.length === 0) {
            apartmentsContainer.innerHTML = '';
            if (resultsCount) resultsCount.style.display = 'none';
            if (noResults) noResults.style.display = 'block';
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            return;
        }

        // Hide no results, show results count
        if (noResults) noResults.style.display = 'none';
        if (resultsCount) resultsCount.style.display = 'block';

        // Render apartment cards using the same style as featured apartments
        apartmentsContainer.innerHTML = this.displayedApartments.map(apartment => this.createApartmentCard(apartment)).join('');

        // Show/hide load more button
        if (loadMoreContainer) {
            if (this.displayedApartments.length < this.filteredApartments.length) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }

        // Add click handlers to cards
        this.bindCardEvents();
    }

    createApartmentCard(apartment) {
        const formattedPrice = this.formatCurrency(apartment.price, apartment.currency);
        
        // Try multiple image sources
        let imageUrl = null;
        
        // Try different image property structures from Railway API
        if (apartment.main_image && apartment.main_image !== 'wp-content/uploads/2025/02/unsplash.jpg') {
            imageUrl = this.getImageUrl(apartment.main_image);
        } else if (apartment.media?.images?.[0]) {
            imageUrl = this.getImageUrl(apartment.media.images[0]);
        } else if (apartment.images && Array.isArray(apartment.images) && apartment.images.length > 0) {
            imageUrl = this.getImageUrl(apartment.images[0]);
        } else if (apartment.images?.main) {
            imageUrl = this.getImageUrl(apartment.images.main);
        } else if (apartment.gallery_images?.[0]) {
            imageUrl = this.getImageUrl(apartment.gallery_images[0]);
        } else {
            // Use fallback image
            imageUrl = 'wp-content/uploads/2025/02/unsplash.jpg';
        }
        
        // Debug: Log image data structure for first few apartments
        if (apartment.id <= 3) {
            console.log(`🖼️ Property ${apartment.id} (${apartment.title}) - Image data:`, {
                main_image: apartment.main_image,
                media_images: apartment.media?.images,
                images_array: apartment.images,
                gallery_images: apartment.gallery_images,
                final_url: imageUrl
            });
        }
        
        const finalImageUrl = imageUrl || 'wp-content/uploads/2025/02/unsplash.jpg';
        
        return `
            <div class="property-card" data-id="${apartment.id}" data-navigate-to="apartment-details" style="cursor: pointer;">
                <div class="property-image-wrapper">
                    <img src="${finalImageUrl}" alt="${apartment.title}" class="property-image" onerror="this.src='wp-content/uploads/2025/02/unsplash.jpg'">
                    <div class="property-tags">
                        <span class="property-tag tag-${apartment.status?.toLowerCase().replace(' ', '-')}">${apartment.status}</span>
                    </div>
                    <div class="property-price">${formattedPrice}</div>
                    <div class="property-branding">
                        <span>ZENTRO HOMES</span>
                    </div>
                </div>
                
                <div class="property-content">
                    <h3 class="property-title">${apartment.title}</h3>
                    <p class="property-location">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        ${apartment.location?.area || 'Unknown'}, ${apartment.location?.city || 'Unknown'}
                    </p>
                    
                    <div class="property-features">
                        <div class="feature-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 21V8l9-7 9 7v13h-6v-7h-6v7H3z"/>
                            </svg>
                            ${apartment.features?.bedrooms || 0} beds
                        </div>
                        <div class="feature-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 14v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M17 5H7a2 2 0 0 0-2 2v3h14V7a2 2 0 0 0-2-2zM5 10h14"/>
                            </svg>
                            ${apartment.features?.bathrooms || 0} baths
                        </div>
                        <div class="feature-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                            </svg>
                            ${apartment.features?.size || 0}${apartment.features?.sizeUnit || 'm²'}
                        </div>
                    </div>
                    
                    <div class="property-type">${apartment.type}</div>
                </div>
            </div>
        `;
    }

    updateResultsCount() {
        const resultsCount = document.getElementById('results-count');
        if (!resultsCount) return;

        const total = this.filteredApartments.length;
        const showing = Math.min(this.displayedApartments.length, total);
        
        if (total === 0) {
            resultsCount.style.display = 'none';
            return;
        }

        const hasFilters = Object.keys(this.currentFilters).some(key => this.currentFilters[key]);
        
        if (hasFilters) {
            resultsCount.innerHTML = `Showing ${showing} of ${total} properties matching your criteria`;
        } else {
            resultsCount.innerHTML = `Showing ${showing} of ${total} properties`;
        }
        
        resultsCount.style.display = 'block';
    }

    updatePagination() {
        this.totalPages = Math.ceil(this.filteredApartments.length / this.itemsPerPage);
    }

    bindTabEvents() {
        const tabs = document.querySelectorAll('.property-search-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                console.log('🔄 Tab clicked:', e.target.dataset.status);
                
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                e.target.classList.add('active');
                
                // Update filter
                const status = e.target.dataset.status;
                this.currentFilters.status = status;
                console.log('📝 Updated filters:', this.currentFilters);
                this.applyFilters();
            });
        });
    }

    initializeSearchDropdowns() {
        // Get unique values for dropdowns
        const locations = [...new Set(this.apartments.map(apt => apt.location.area))];
        const types = [...new Set(this.apartments.map(apt => apt.type))];
        const priceRanges = [
            { value: '', label: 'Any Price' },
            { value: '0-50000000', label: 'Under KES 50M' },
            { value: '50000000-100000000', label: 'KES 50M - 100M' },
            { value: '100000000-200000000', label: 'KES 100M - 200M' },
            { value: '200000000-999999999', label: 'Above KES 200M' }
        ];
        const bedrooms = [1, 2, 3, 4, 5, 6, 7, 8];

        // Populate location dropdown
        this.populateDropdown('location-dropdown', locations.map(loc => ({ value: loc, label: loc })));
        
        // Populate type dropdown
        this.populateDropdown('type-dropdown', types.map(type => ({ value: type, label: type })));
        
        // Populate price dropdown
        this.populateDropdown('price-dropdown', priceRanges);
        
        // Populate bedrooms dropdown
        this.populateDropdown('bedrooms-dropdown', bedrooms.map(bed => ({ value: bed.toString(), label: `${bed}+ Beds` })));
    }

    populateDropdown(dropdownId, options) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;

        dropdown.innerHTML = options.map(option => 
            `<div class="dropdown-item" data-value="${option.value}">${option.label}</div>`
        ).join('');

        // Add click handlers to dropdown items
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const value = e.target.dataset.value;
                const label = e.target.textContent;
                const fieldType = dropdownId.replace('-dropdown', '');
                
                // Update display value
                const displayElement = document.getElementById(`${fieldType}-display`);
                if (displayElement) {
                    displayElement.textContent = label;
                }
                
                // Update filter
                if (fieldType === 'location') {
                    this.currentFilters.location = value;
                } else if (fieldType === 'type') {
                    this.currentFilters.type = value;
                } else if (fieldType === 'price') {
                    this.currentFilters.priceRange = value;
                } else if (fieldType === 'bedrooms') {
                    this.currentFilters.bedrooms = value;
                }
                
                // Close dropdown and apply filters
                dropdown.classList.remove('show');
                this.applyFilters();
            });
        });
    }

    bindSearchFieldEvents() {
        // Dropdown hover/click events using the CSS hover functionality
        const searchFields = document.querySelectorAll('.search-field');
        searchFields.forEach(field => {
            const dropdown = field.querySelector('.search-dropdown');
            if (!dropdown) return;

            // Add click event to show/hide dropdown
            field.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Close all other dropdowns
                document.querySelectorAll('.search-dropdown').forEach(dd => {
                    if (dd !== dropdown) dd.classList.remove('show');
                });
                
                // Toggle current dropdown
                dropdown.classList.toggle('show');
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-field')) {
                document.querySelectorAll('.search-dropdown').forEach(dd => {
                    dd.classList.remove('show');
                });
            }
        });

        // Search button
        const searchButton = document.getElementById('search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                this.applyFilters();
            });
        }
    }

    bindCardEvents() {
        // Add click handlers for property cards navigation
        this.addPropertyCardListeners();
        
        // Load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.currentPage++;
                this.renderApartments();
            });
        }
    }

    addPropertyCardListeners() {
        // Remove existing listeners to avoid duplicates
        document.removeEventListener('click', this.handlePropertyCardClick);
        
        // Add event delegation for property cards
        this.handlePropertyCardClick = (event) => {
            const propertyCard = event.target.closest('.property-card[data-navigate-to="apartment-details"]');
            if (propertyCard) {
                const apartmentId = propertyCard.getAttribute('data-id');
                console.log('🔗 All Properties: Navigating to apartment details with ID:', apartmentId);
                window.location.href = `apartment-details.html?id=${apartmentId}`;
            }
        };
        
        document.addEventListener('click', this.handlePropertyCardClick);
    }

    applyFilters() {
        console.log('🔍 Applying filters:', this.currentFilters);
        
        this.filteredApartments = this.apartments.filter(apartment => {
            // Status filter (For Sale/For Rent)
            if (this.currentFilters.status && apartment.status !== this.currentFilters.status) {
                console.log(`❌ Status filter: ${apartment.title} is ${apartment.status}, looking for ${this.currentFilters.status}`);
                return false;
            }

            // Location filter
            if (this.currentFilters.location && this.currentFilters.location !== '') {
                const searchTerm = this.currentFilters.location.toLowerCase();
                const locationMatch = 
                    apartment.location.area.toLowerCase() === searchTerm ||
                    apartment.location.city.toLowerCase().includes(searchTerm) ||
                    apartment.location.country.toLowerCase().includes(searchTerm);
                
                if (!locationMatch) {
                    console.log(`❌ Location filter: ${apartment.title} location doesn't match ${searchTerm}`);
                    return false;
                }
            }

            // Price range filter
            if (this.currentFilters.priceRange && this.currentFilters.priceRange !== '') {
                const range = this.currentFilters.priceRange;
                if (range.includes('-')) {
                    const [min, max] = range.split('-').map(x => parseInt(x));
                    if (apartment.price < min || apartment.price > max) {
                        console.log(`❌ Price filter: ${apartment.title} price ${apartment.price} not in range ${min}-${max}`);
                        return false;
                    }
                }
            }

            // Property type filter
            if (this.currentFilters.type && this.currentFilters.type !== '' && apartment.type !== this.currentFilters.type) {
                console.log(`❌ Type filter: ${apartment.title} is ${apartment.type}, looking for ${this.currentFilters.type}`);
                return false;
            }

            // Bedrooms filter
            if (this.currentFilters.bedrooms && this.currentFilters.bedrooms !== '') {
                const minBedrooms = parseInt(this.currentFilters.bedrooms);
                if (apartment.features.bedrooms < minBedrooms) {
                    console.log(`❌ Bedrooms filter: ${apartment.title} has ${apartment.features.bedrooms} beds, need ${minBedrooms}+`);
                    return false;
                }
            }

            return true;
        });

        console.log(`✅ Filtered results: ${this.filteredApartments.length} of ${this.apartments.length} apartments`);

        // Reset pagination
        this.currentPage = 1;
        this.updatePagination();
        
        // Re-render
        this.renderApartments();
    }

    formatCurrency(price, currency = 'KES') {
        const formattedNumber = new Intl.NumberFormat('en-KE').format(price);
        return `${currency} ${formattedNumber}`;
    }

    getImageUrl(imageData) {
        if (!imageData) return null;
        
        // If Railway client is available, use its image URL helper
        if (window.railwayClient && window.railwayClient.getImageUrl) {
            return window.railwayClient.getImageUrl(imageData);
        }
        
        // Handle Railway API image data structure
        if (Array.isArray(imageData) && imageData.length > 0) {
            return this.getImageUrl(imageData[0]); // Get first image from array
        }
        
        // Handle string URLs
        if (typeof imageData === 'string') {
            // Railway Volume Storage URLs
            if (imageData.startsWith('/uploads/')) {
                return window.location.origin + imageData;
            }
            // Already a full URL
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

    createFallbackData() {
        return [
            {
                id: 1,
                title: "Luxury Villa in Kilimani",
                type: "Villa",
                status: "For Sale",
                price: 75000000,
                currency: "KES",
                location: { area: "Kilimani", city: "Nairobi", country: "Kenya" },
                features: { bedrooms: 4, bathrooms: 3, parking: 2, size: 350, sizeUnit: "m²" },
                images: { main: "wp-content/uploads/2025/02/unsplash.jpg" },
                description: "Beautiful luxury villa with modern amenities.",
                featured: true,
                available: true,
                published: true,
                dateAdded: new Date().toISOString()
            },
            {
                id: 2,
                title: "Modern Apartment in Westlands",
                type: "Apartment",
                status: "For Sale",
                price: 45000000,
                currency: "KES",
                location: { area: "Westlands", city: "Nairobi", country: "Kenya" },
                features: { bedrooms: 3, bathrooms: 2, parking: 1, size: 180, sizeUnit: "m²" },
                images: { main: "wp-content/uploads/2025/02/unsplash.jpg" },
                description: "Contemporary apartment in prime location.",
                featured: false,
                available: true,
                published: true,
                dateAdded: new Date().toISOString()
            },
            {
                id: 3,
                title: "Penthouse in Lavington",
                type: "Penthouse",
                status: "For Sale",
                price: 120000000,
                currency: "KES",
                location: { area: "Lavington", city: "Nairobi", country: "Kenya" },
                features: { bedrooms: 5, bathrooms: 4, parking: 3, size: 450, sizeUnit: "m²" },
                images: { main: "wp-content/uploads/2025/02/unsplash.jpg" },
                description: "Exclusive penthouse with panoramic city views.",
                featured: true,
                available: true,
                published: true,
                dateAdded: new Date().toISOString()
            },
            {
                id: 4,
                title: "Condo in Parklands",
                type: "Condo",
                status: "For Rent",
                price: 150000,
                currency: "KES",
                location: { area: "Parklands", city: "Nairobi", country: "Kenya" },
                features: { bedrooms: 2, bathrooms: 2, parking: 1, size: 120, sizeUnit: "m²" },
                images: { main: "wp-content/uploads/2025/02/unsplash.jpg" },
                description: "Modern condo available for rent.",
                featured: false,
                available: true,
                published: true,
                dateAdded: new Date().toISOString()
            },
            {
                id: 5,
                title: "Townhouse in Runda",
                type: "Townhouse",
                status: "For Sale",
                price: 95000000,
                currency: "KES",
                location: { area: "Runda", city: "Nairobi", country: "Kenya" },
                features: { bedrooms: 4, bathrooms: 3, parking: 2, size: 280, sizeUnit: "m²" },
                images: { main: "wp-content/uploads/2025/02/unsplash.jpg" },
                description: "Spacious townhouse in gated community.",
                featured: false,
                available: true,
                published: true,
                dateAdded: new Date().toISOString()
            }
        ];
    }
}

// Global function to clear all filters
function clearAllFilters() {
    if (window.allPropertiesManager) {
        // Reset display values
        const locationDisplay = document.getElementById('location-display');
        const typeDisplay = document.getElementById('type-display');
        const priceDisplay = document.getElementById('price-display');
        const bedroomsDisplay = document.getElementById('bedrooms-display');
        const tabs = document.querySelectorAll('.property-search-tab');

        if (locationDisplay) locationDisplay.textContent = 'Nairobi';
        if (typeDisplay) typeDisplay.textContent = 'Any Type';
        if (priceDisplay) priceDisplay.textContent = 'Any Price';
        if (bedroomsDisplay) bedroomsDisplay.textContent = 'Any';

        // Reset active tab to "For Sale"
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.status === 'For Sale') {
                tab.classList.add('active');
            }
        });

        // Clear filters and re-render
        window.allPropertiesManager.currentFilters = { status: 'For Sale' };
        window.allPropertiesManager.applyFilters();
    }
}

// Global function to toggle favorites
function toggleFavorite(apartmentId, event) {
    event.stopPropagation();
    
    const button = event.currentTarget;
    const svg = button.querySelector('svg path');
    
    // Toggle visual state
    if (svg.getAttribute('fill') === 'currentColor') {
        svg.setAttribute('fill', 'none');
        button.classList.remove('active');
    } else {
        svg.setAttribute('fill', 'currentColor');
        button.classList.add('active');
    }

    // Here you could add logic to save favorites to localStorage or backend
    console.log(`Toggled favorite for apartment ${apartmentId}`);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    if (window.location.pathname.includes('all-properties')) {
        window.allPropertiesManager = new AllPropertiesManager();
    }
});