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
        this.bindEvents();
    }

    async loadApartments() {
        try {
            console.log('🕐 All Properties: Starting to load apartments...');
            
            // Wait for shared data manager to exist
            let attempts = 0;
            while (!window.sharedDataManager && attempts < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.sharedDataManager) {
                throw new Error('SharedDataManager not available');
            }
            
            console.log('📡 All Properties: SharedDataManager found, waiting for database sync...');
            
            // Wait for database sync to complete
            attempts = 0;
            while (attempts < 200) { // 20 seconds max
                const connectionInfo = window.sharedDataManager.getConnectionInfo();
                
                if (attempts % 20 === 0) {
                    console.log(`🔄 All Properties: Waiting for database sync... (attempt ${attempts})`, {
                        isOnline: connectionInfo.isOnline,
                        lastSync: connectionInfo.lastSync,
                        totalProperties: connectionInfo.totalProperties,
                        dataSource: connectionInfo.dataSource
                    });
                }
                
                // Check if we have real database sync
                if (connectionInfo.isOnline && 
                    connectionInfo.lastSync && 
                    connectionInfo.dataSource === 'database' &&
                    connectionInfo.totalProperties > 0) {
                    
                    console.log('✅ All Properties: Database sync confirmed! Loading all data...');
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            // Get all apartments
            this.apartments = await window.sharedDataManager.getAllApartments();
            const finalConnectionInfo = window.sharedDataManager.getConnectionInfo();
            
            console.log(`🎯 All Properties: Loaded ${this.apartments.length} apartments from ${finalConnectionInfo.dataSource}`);
            console.log('🔢 All Properties - Available apartment IDs:', this.apartments.map(apt => ({ id: apt.id, title: apt.title })));
            
            this.filteredApartments = [...this.apartments];
            this.isLoading = false;
            this.updatePagination();
            
            // Apply initial filter (For Sale by default)
            this.applyFilters();
            
            console.log(`📦 All Properties ready for display:`, this.apartments.length);
            console.log(`📊 Property statuses:`, this.apartments.map(apt => `${apt.title}: ${apt.status}`));
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
        
        return `
            <div class="property-card" data-id="${apartment.id}" onclick="window.location.href='apartment-details.html?id=${apartment.id}'" style="cursor: pointer;">
                <div class="property-image-wrapper">
                    <img src="${apartment.images?.main || 'wp-content/uploads/2025/02/unsplash.jpg'}" alt="${apartment.title}" class="property-image">
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
        // Cards already have onclick handlers in the HTML
        // Load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.currentPage++;
                this.renderApartments();
            });
        }
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