// Modern Apartments JavaScript Implementation
class ModernApartmentManager {
    constructor() {
        this.apartments = [];
        this.filteredApartments = [];
        this.currentFilters = {};
        this.currentSort = 'newest';
        this.isLoading = true;

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
            console.log('🕐 Modern Apartments: Starting to load apartments...');
            
            // Wait for shared data manager to exist
            let attempts = 0;
            while (!window.sharedDataManager && attempts < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.sharedDataManager) {
                throw new Error('SharedDataManager not available');
            }
            
            console.log('📡 Modern Apartments: SharedDataManager found, waiting for database sync...');
            
            // CRITICAL: Wait for actual database sync to complete (lastSync timestamp set)
            attempts = 0;
            while (attempts < 200) { // 20 seconds max
                const connectionInfo = window.sharedDataManager.getConnectionInfo();
                
                if (attempts % 20 === 0) {
                    console.log(`🔄 Modern Apartments: Waiting for database sync... (attempt ${attempts})`, {
                        isOnline: connectionInfo.isOnline,
                        lastSync: connectionInfo.lastSync,
                        totalProperties: connectionInfo.totalProperties,
                        dataSource: connectionInfo.dataSource
                    });
                }
                
                // Check if we have real database sync (lastSync exists and dataSource is 'database')
                if (connectionInfo.isOnline && 
                    connectionInfo.lastSync && 
                    connectionInfo.dataSource === 'database' &&
                    connectionInfo.totalProperties > 6) { // Expect more than 6 mock properties
                    
                    console.log('✅ Modern Apartments: Database sync confirmed! Loading real data...');
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            // Get the apartments after database sync is confirmed
            this.apartments = await window.sharedDataManager.getAllApartments();
            const finalConnectionInfo = window.sharedDataManager.getConnectionInfo();
            
            console.log(`🎯 Modern Apartments: Loaded ${this.apartments.length} apartments from ${finalConnectionInfo.dataSource}`);
            console.log(`📊 Final connection status:`, finalConnectionInfo);
            console.log('🔢 Featured Apartments - Available apartment IDs:', this.apartments.map(apt => ({ id: apt.id, title: apt.title })));
            
            // Verify we got real database data, not mock data
            if (this.apartments.length > 0) {
                console.log(`🔍 First loaded apartment:`, this.apartments[0]);
                if (this.apartments[0].title === 'Luxury Villa') {
                    console.error('❌ Still getting mock data! Database sync failed.');
                } else {
                    console.log('✅ Real database data confirmed!');
                }
            }
            
            this.filteredApartments = [...this.apartments];
            this.isLoading = false;
            
            console.log(`📦 Apartments ready for display:`, this.apartments.length);
        } catch (error) {
            console.error('❌ Error loading apartments:', error);
            // Fallback to static data
            this.apartments = [...apartmentsData.apartments];
            this.filteredApartments = [...this.apartments];
            this.isLoading = false;
            console.log('⚠️ Modern Apartments: Using fallback static data due to error');
        }
    }

    showLoadingState() {
        const apartmentsContainer = document.getElementById('apartments-grid');
        if (!apartmentsContainer) return;

        apartmentsContainer.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading properties...</p>
            </div>
        `;
    }

    renderSearchAndFilters() {
        const filtersContainer = document.getElementById('apartments-filters');
        if (!filtersContainer) return;

        // Get dynamic filter options from loaded apartments
        const filterOptions = this.getFilterOptions();

        filtersContainer.innerHTML = `
      <div class="search-filter-container enhanced-search-bar">
        <!-- Enhanced Unified Search Bar -->
        <div class="unified-search-bar">
          <div class="unified-search-item">
            <label class="unified-search-label">Property Type</label>
            <select id="filter-type" class="unified-search-select">
              <option value="">Select</option>
              ${filterOptions.types.map(type => `<option value="${type}">${type}</option>`).join('')}
            </select>
          </div>
          
          <div class="unified-search-item">
            <label class="unified-search-label">Bedrooms</label>
            <select id="filter-bedrooms" class="unified-search-select">
              <option value="">Select</option>
              ${filterOptions.bedrooms.map(count => `<option value="${count}">${count}${count >= 8 ? '+' : ''}</option>`).join('')}
            </select>
          </div>
          
          <div class="unified-search-item">
            <label class="unified-search-label">Location</label>
            <select id="filter-location" class="unified-search-select">
              <option value="">Select</option>
              ${filterOptions.locations.map(location => `<option value="${location}">${location}</option>`).join('')}
            </select>
          </div>
          
          <div class="unified-search-item">
            <label class="unified-search-label">Status</label>
            <select id="filter-status" class="unified-search-select">
              <option value="">Select</option>
              ${filterOptions.statuses.map(status => `<option value="${status}">${status}</option>`).join('')}
            </select>
          </div>
          
          <div class="unified-search-item">
            <label class="unified-search-label">Budget</label>
            <select id="filter-price" class="unified-search-select">
              <option value="">Select</option>
              ${this.generatePriceRanges(filterOptions.priceRange).map(range =>
            `<option value="${range.min}-${range.max}">${range.label}</option>`
        ).join('')}
            </select>
          </div>
          
          <button class="unified-search-button" id="search-button">
            Search
          </button>
        </div>
      </div>
    `;
    }

    getFilterOptions() {
        if (this.apartments.length === 0) {
            // Return fallback options if no apartments loaded yet
            return apartmentsData.filters;
        }

        const types = [...new Set(this.apartments.map(apt => apt.type))].sort();
        const locations = [...new Set(this.apartments.map(apt => apt.location.area))].sort();
        const statuses = [...new Set(this.apartments.map(apt => apt.status))].sort();
        const bedrooms = [...new Set(this.apartments.map(apt => apt.features.bedrooms))].sort((a, b) => a - b);
        
        const prices = this.apartments.map(apt => apt.price).filter(price => price > 0);
        const priceRange = {
            min: prices.length > 0 ? Math.min(...prices) : 0,
            max: prices.length > 0 ? Math.max(...prices) : 100000000
        };

        return {
            types,
            locations,
            statuses,
            bedrooms,
            priceRange
        };
    }

    generatePriceRanges(priceRange) {
        if (!priceRange || priceRange.min === priceRange.max) {
            return apartmentsData.filters.priceRanges;
        }

        const min = priceRange.min;
        const max = priceRange.max;
        const step = Math.ceil((max - min) / 6);

        const ranges = [];
        for (let i = 0; i < 6; i++) {
            const rangeMin = min + (step * i);
            const rangeMax = i === 5 ? max : min + (step * (i + 1));
            
            ranges.push({
                min: rangeMin,
                max: rangeMax,
                label: `${this.formatPrice(rangeMin)} - ${this.formatPrice(rangeMax)}`
            });
        }

        return ranges;
    }

    formatPrice(price) {
        if (price >= 1000000) {
            return `${(price / 1000000).toFixed(1)}M KES`;
        } else if (price >= 1000) {
            return `${(price / 1000).toFixed(0)}K KES`;
        }
        return `${price} KES`;
    }

    formatCurrency(price, currency = 'KES') {
        const formattedNumber = new Intl.NumberFormat('en-KE').format(price);
        return `${currency} ${formattedNumber}`;
    }

    filterApartments(apartments, filters) {
        return apartments.filter(apartment => {
            // Type filter
            if (filters.type && apartment.type !== filters.type) {
                return false;
            }
            
            // Status filter
            if (filters.status && apartment.status !== filters.status) {
                return false;
            }
            
            // Location filter
            if (filters.location && !apartment.location.area.toLowerCase().includes(filters.location.toLowerCase())) {
                return false;
            }
            
            // Price range filter
            if (filters.priceMin && apartment.price < filters.priceMin) {
                return false;
            }
            if (filters.priceMax && apartment.price > filters.priceMax) {
                return false;
            }
            
            // Bedrooms filter
            if (filters.bedrooms && apartment.features.bedrooms < filters.bedrooms) {
                return false;
            }
            
            return true;
        });
    }

    sortApartments(apartments, sortBy) {
        const sortedApartments = [...apartments];
        
        switch (sortBy) {
            case 'price-low':
                return sortedApartments.sort((a, b) => a.price - b.price);
            case 'price-high':
                return sortedApartments.sort((a, b) => b.price - a.price);
            case 'newest':
                return sortedApartments.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
            case 'oldest':
                return sortedApartments.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
            default:
                return sortedApartments;
        }
    }

    renderApartments() {
        const apartmentsContainer = document.getElementById('apartments-grid');
        if (!apartmentsContainer) {
            console.error('❌ apartments-grid container not found');
            return;
        }

        console.log(`🎨 Rendering ${this.filteredApartments.length} apartments`);
        
        // Debug: Log the first apartment data structure
        if (this.filteredApartments.length > 0) {
            console.log('🔍 First apartment data structure:', this.filteredApartments[0]);
        }

        // Change the class to property-grid for our new styling
        apartmentsContainer.className = 'property-grid';

        if (this.filteredApartments.length === 0) {
            // Enhanced no results state with icon and better styling
            apartmentsContainer.innerHTML = `
        <div class="no-results">
          <svg class="no-results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M10 10l4 4m0-4l-4 4m2-10a8 8 0 100 16 8 8 0 000-16z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3>No properties found</h3>
          <p>We couldn't find any properties matching your current filters.</p>
          <p>Try adjusting your search criteria or clearing all filters to see more options.</p>
          <button class="no-results-btn" onclick="modernApartmentManager.clearFilters()">Clear All Filters</button>
        </div>
      `;
            return;
        }

        apartmentsContainer.innerHTML = this.filteredApartments.map(apartment => {
            // Debug: Log each apartment being rendered
            console.log(`🏠 Rendering apartment:`, apartment.title, apartment.id);
            
            return `
      <div class="property-card" data-id="${apartment.id}" onclick="modernApartmentManager.viewApartment(${apartment.id})" style="cursor: pointer;">
        <div class="property-image-wrapper">
          <img src="${apartment.images?.main || 'wp-content/uploads/2025/02/unsplash.jpg'}" alt="${apartment.title}" class="property-image">
          <div class="property-tags">
            ${apartment.featured ? '<span class="property-tag tag-featured">FEATURED</span>' : ''}
            <span class="property-tag tag-${apartment.status?.toLowerCase().replace(' ', '-')}">${apartment.status}</span>
          </div>
          <div class="property-price">${this.formatCurrency(apartment.price, apartment.currency)}</div>
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
        }).join('');
    }

    bindEvents() {
        // Unified search bar selects
        document.getElementById('filter-type')?.addEventListener('change', (e) => {
            this.updateFilterValue('type', e.target.value);
            this.animateSelectChange(e.target);
        });

        document.getElementById('filter-status')?.addEventListener('change', (e) => {
            this.updateFilterValue('status', e.target.value);
            this.animateSelectChange(e.target);
        });

        document.getElementById('filter-location')?.addEventListener('change', (e) => {
            this.updateFilterValue('location', e.target.value);
            this.animateSelectChange(e.target);
        });

        document.getElementById('filter-price')?.addEventListener('change', (e) => {
            if (e.target.value) {
                const [min, max] = e.target.value.split('-').map(Number);
                this.updateFilterValue('priceRange', { priceMin: min, priceMax: max });
            } else {
                this.updateFilterValue('priceRange', { priceMin: null, priceMax: null });
            }
            this.animateSelectChange(e.target);
        });

        document.getElementById('filter-bedrooms')?.addEventListener('change', (e) => {
            this.updateFilterValue('bedrooms', e.target.value ? parseInt(e.target.value) : null);
            this.animateSelectChange(e.target);
        });

        // Search button
        document.getElementById('search-button')?.addEventListener('click', () => {
            this.applyAllFilters();
            this.animateSearchButton();
        });

        // Remove dropdown option clicks to prevent dropdown from showing on click
        // We'll rely only on the native select behavior
        
        // Add focus and blur events for enhanced dropdown experience
        document.querySelectorAll('.unified-search-select').forEach(select => {
            select.addEventListener('focus', (e) => {
                const item = e.target.closest('.unified-search-item');
                item.style.backgroundColor = 'rgba(248, 211, 94, 0.05)';
            });
            
            select.addEventListener('blur', (e) => {
                const item = e.target.closest('.unified-search-item');
                item.style.backgroundColor = '';
            });
        });
    }

    updateFilterValue(filterType, value) {
        // Store the value but don't apply filters yet
        switch (filterType) {
            case 'type':
                this.currentFilters.type = value;
                break;
            case 'status':
                this.currentFilters.status = value;
                break;
            case 'location':
                this.currentFilters.location = value;
                break;
            case 'priceRange':
                this.currentFilters.priceMin = value.priceMin;
                this.currentFilters.priceMax = value.priceMax;
                break;
            case 'bedrooms':
                this.currentFilters.bedrooms = value;
                break;
            default:
                break;
        }
    }

    applyAllFilters() {
        this.filteredApartments = this.filterApartments(this.apartments, this.currentFilters);
        this.applySorting();
        this.updateFilterUI();
    }

    applyFilters(newFilters) {
        this.currentFilters = { ...this.currentFilters, ...newFilters };
        this.filteredApartments = this.filterApartments(this.apartments, this.currentFilters);
        this.applySorting();
        this.renderApartments();
    }

    applySorting() {
        this.filteredApartments = this.sortApartments(this.filteredApartments, this.currentSort);
        this.renderApartments();
    }

    clearFilters() {
        this.currentFilters = {};
        this.currentSort = 'newest';
        this.filteredApartments = [...this.apartments];

        // Reset form inputs
        document.getElementById('filter-type').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-location').value = '';
        document.getElementById('filter-price').value = '';
        document.getElementById('filter-bedrooms').value = '';

        // Reset active state on filter selects
        document.querySelectorAll('.filter-select, .unified-search-select').forEach(select => {
            select.classList.remove('active');
        });

        this.applySorting();
    }

    updateFilterUI() {
        // Update select dropdowns and set active state
        const filterType = document.getElementById('filter-type');
        filterType.value = this.currentFilters.type || '';
        filterType.classList.toggle('active', !!this.currentFilters.type);

        const filterStatus = document.getElementById('filter-status');
        filterStatus.value = this.currentFilters.status || '';
        filterStatus.classList.toggle('active', !!this.currentFilters.status);

        const filterLocation = document.getElementById('filter-location');
        filterLocation.value = this.currentFilters.location || '';
        filterLocation.classList.toggle('active', !!this.currentFilters.location);

        const filterBedrooms = document.getElementById('filter-bedrooms');
        filterBedrooms.value = this.currentFilters.bedrooms || '';
        filterBedrooms.classList.toggle('active', !!this.currentFilters.bedrooms);

        // Update price range
        const priceSelect = document.getElementById('filter-price');
        if (this.currentFilters.priceMin !== null && this.currentFilters.priceMax !== null) {
            priceSelect.value = `${this.currentFilters.priceMin}-${this.currentFilters.priceMax}`;
            priceSelect.classList.add('active');
        } else {
            priceSelect.value = '';
            priceSelect.classList.remove('active');
        }
    }
    
    animateSelectChange(selectElement) {
        // Add a subtle animation to the select element when changed
        const item = selectElement.closest('.unified-search-item');
        
        // Flash effect
        item.style.backgroundColor = 'rgba(248, 211, 94, 0.1)';
        
        setTimeout(() => {
            item.style.backgroundColor = '';
        }, 300);
        
        // If the select has a value, add the active class
        if (selectElement.value) {
            selectElement.classList.add('active');
        } else {
            selectElement.classList.remove('active');
        }
    }
    
    animateSearchButton() {
        // Add a pulse animation to the search button
        const button = document.getElementById('search-button');
        if (!button) return;
        
        button.style.transform = 'scale(0.95)';
        button.style.boxShadow = '0 2px 8px rgba(248, 211, 94, 0.5)';
        
        setTimeout(() => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 6px 16px rgba(248, 211, 94, 0.4)';
            
            setTimeout(() => {
                button.style.transform = '';
                button.style.boxShadow = '';
            }, 200);
        }, 100);
    }

    viewApartment(id) {
        console.log('🔗 Featured Apartments: Navigating to apartment details with ID:', id, typeof id);
        window.location.href = `apartment-details.html?id=${id}`;
    }
}

// Add featured property flag to some apartments for demonstration
apartmentsData.apartments.forEach((apartment, index) => {
    // Mark some apartments as featured
    apartment.featured = index % 3 === 0;
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    if (document.getElementById('apartments-grid')) {
        window.modernApartmentManager = new ModernApartmentManager();
    }
});