// Zentro Homes - Featured Apartments JavaScript
class ApartmentManager {
  constructor() {
    this.apartments = apartmentsData.apartments;
    this.filteredApartments = [...this.apartments];
    this.currentFilters = {};
    this.currentSort = 'newest';
    
    this.init();
  }
  
  init() {
    this.renderSearchAndFilters();
    this.renderApartments();
    this.bindEvents();
  }
  
  renderSearchAndFilters() {
    const filtersContainer = document.getElementById('apartments-filters');
    if (!filtersContainer) return;
    
    filtersContainer.innerHTML = `
      <div class="apartments-search-filters">
        <div class="search-filters-wrap">
          
          <!-- Modern Search Bar -->
          <div class="search-bar">
            <div class="search-input-wrap">
              <input type="text" id="apartment-search" placeholder="Search properties by name, location, or features..." class="search-input" data-translate="searchPlaceholder">
              <button class="search-btn" id="search-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Modern Filters Row -->
          <div class="filters-row">
            <div class="filter-group">
              <label data-translate="propertyType">Property Type</label>
              <select id="filter-type" class="filter-select">
                <option value="" data-translate="allTypes">All Types</option>
                ${apartmentsData.filters.types.map(type => `<option value="${type}">${type}</option>`).join('')}
              </select>
            </div>
            
            <div class="filter-group">
              <label data-translate="status">Status</label>
              <select id="filter-status" class="filter-select">
                <option value="" data-translate="allStatuses">All</option>
                ${apartmentsData.filters.statuses.map(status => `<option value="${status}">${status}</option>`).join('')}
              </select>
            </div>
            
            <div class="filter-group">
              <label data-translate="location">Location</label>
              <select id="filter-location" class="filter-select">
                <option value="" data-translate="allLocations">All Locations</option>
                ${apartmentsData.filters.locations.map(location => `<option value="${location}">${location}</option>`).join('')}
              </select>
            </div>
            
            <div class="filter-group">
              <label data-translate="priceRange">Price Range</label>
              <select id="filter-price" class="filter-select">
                <option value="" data-translate="allPrices">All Prices</option>
                ${apartmentsData.filters.priceRanges.map(range => 
                  `<option value="${range.min}-${range.max}">${range.label}</option>`
                ).join('')}
              </select>
            </div>
            
            <div class="filter-group">
              <label data-translate="bedrooms">Bedrooms</label>
              <select id="filter-bedrooms" class="filter-select">
                <option value="" data-translate="anyBedrooms">Any</option>
                ${apartmentsData.filters.bedrooms.map(count => `<option value="${count}">${count}${count === 8 ? '+' : ''}</option>`).join('')}
              </select>
            </div>
            
            <div class="filter-group">
              <label data-translate="sortBy">Sort By</label>
              <select id="sort-apartments" class="filter-select">
                <option value="newest" data-translate="newestFirst">Newest First</option>
                <option value="oldest" data-translate="oldestFirst">Oldest First</option>
                <option value="price-low" data-translate="priceLowToHigh">Price: Low to High</option>
                <option value="price-high" data-translate="priceHighToLow">Price: High to Low</option>
                <option value="bedrooms-high" data-translate="mostBedrooms">Most Bedrooms</option>
                <option value="bedrooms-low" data-translate="leastBedrooms">Least Bedrooms</option>
                <option value="size-high" data-translate="largestSize">Largest Size</option>
                <option value="size-low" data-translate="smallestSize">Smallest Size</option>
              </select>
            </div>
            
            <button class="clear-filters-btn" id="clear-filters" data-translate="clearAll">Clear All</button>
          </div>
          
          <!-- Modern Results Info -->
          <div class="results-info">
            <span id="results-count">${this.apartments.length} <span data-translate="apartmentsFound">apartments found</span></span>
          </div>
        </div>
      </div>
    `;
  }
  
  renderApartments() {
    const apartmentsContainer = document.getElementById('apartments-grid');
    if (!apartmentsContainer) return;
    
    if (this.filteredApartments.length === 0) {
      apartmentsContainer.innerHTML = `
        <div class="no-results">
          <div class="no-results-content">
            <h3>No apartments found</h3>
            <p>Try adjusting your search criteria or clearing filters</p>
            <button class="btn" onclick="apartmentManager.clearFilters()">Clear Filters</button>
          </div>
        </div>
      `;
      return;
    }
    
    apartmentsContainer.innerHTML = this.filteredApartments.map(apartment => `
      <div class="apartment-card" data-id="${apartment.id}">
        <div class="apartment-image-container">
          <img src="${apartment.images.main}" alt="${apartment.title}" class="apartment-image">
          <div class="apartment-price">${ApartmentUtils.formatPrice(apartment.price, apartment.currency)}</div>
          <div class="apartment-status ${apartment.status.toLowerCase().replace(' ', '-')}">${apartment.status}</div>
          <div class="image-count">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            ${apartment.images.gallery.length + 1}
          </div>
        </div>
        
        <div class="apartment-content">
          <div class="apartment-header">
            <h3 class="apartment-title">${apartment.title}</h3>
            <div class="apartment-type">${apartment.type}</div>
          </div>
          
          <div class="apartment-location">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.58172 7.58172 1 12 1C16.4183 1 21 5.58172 21 10Z" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            ${apartment.location.area}, ${apartment.location.city}
          </div>
          
          <div class="apartment-features">
            <div class="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 21V11L12 3L21 11V21H15V15H9V21H3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              ${apartment.features.bedrooms} beds
            </div>
            <div class="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 6L20 6C20.5523 6 21 6.44772 21 7V17C21 17.5523 20.5523 18 20 18H4C3.44772 18 3 17.5523 3 17V7C3 6.44772 3.44772 6 4 6H5" stroke="currentColor" stroke-width="2"/>
                <circle cx="9" cy="12" r="2" stroke="currentColor" stroke-width="2"/>
              </svg>
              ${apartment.features.bathrooms} baths
            </div>
            <div class="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 17H19L21 7H3L5 17ZM5 17L4 19M19 17L20 19M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7M9 11H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              ${apartment.features.parking} parking
            </div>
            <div class="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" stroke="currentColor" stroke-width="2"/>
                <path d="M9 9L15 15M15 9L9 15" stroke="currentColor" stroke-width="2"/>
              </svg>
              ${apartment.features.size}${apartment.features.sizeUnit}
            </div>
          </div>
          
          <div class="apartment-description">
            ${apartment.description}
          </div>
          
          <div class="apartment-amenities">
            ${apartment.amenities.slice(0, 3).map(amenity => `<span class="amenity-tag">${amenity}</span>`).join('')}
            ${apartment.amenities.length > 3 ? `<span class="amenity-more">+${apartment.amenities.length - 3} more</span>` : ''}
          </div>
          
          <div class="apartment-actions">
            <button class="apartment-btn primary" onclick="apartmentManager.viewApartment(${apartment.id})">
              View Details
            </button>
            <button class="apartment-btn secondary" onclick="apartmentManager.scheduleVisit(${apartment.id})">
              Schedule Visit
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
    // Update results count
    document.getElementById('results-count').textContent = `${this.filteredApartments.length} apartments found`;
  }
  
  bindEvents() {
    // Modern search input with debounce
    let searchTimeout;
    document.getElementById('apartment-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const searchInput = e.target;
      
      // Add loading state
      searchInput.style.backgroundColor = '#f8f9fa';
      
      searchTimeout = setTimeout(() => {
        this.applyFilters({ search: e.target.value });
        searchInput.style.backgroundColor = '#ffffff';
      }, 300);
    });
    
    // Add focus/blur effects to search input
    document.getElementById('apartment-search')?.addEventListener('focus', (e) => {
      e.target.parentElement.style.transform = 'scale(1.02)';
    });
    
    document.getElementById('apartment-search')?.addEventListener('blur', (e) => {
      e.target.parentElement.style.transform = 'scale(1)';
    });
    
    // Filter selects with modern interactions
    document.getElementById('filter-type')?.addEventListener('change', (e) => {
      this.applyFilters({ type: e.target.value });
      this.addFilterVisualFeedback(e.target);
    });
    
    document.getElementById('filter-status')?.addEventListener('change', (e) => {
      this.applyFilters({ status: e.target.value });
      this.addFilterVisualFeedback(e.target);
    });
    
    document.getElementById('filter-location')?.addEventListener('change', (e) => {
      this.applyFilters({ location: e.target.value });
      this.addFilterVisualFeedback(e.target);
    });
    
    document.getElementById('filter-price')?.addEventListener('change', (e) => {
      if (e.target.value) {
        const [min, max] = e.target.value.split('-').map(Number);
        this.applyFilters({ priceMin: min, priceMax: max });
      } else {
        this.applyFilters({ priceMin: null, priceMax: null });
      }
      this.addFilterVisualFeedback(e.target);
    });
    
    document.getElementById('filter-bedrooms')?.addEventListener('change', (e) => {
      this.applyFilters({ bedrooms: e.target.value ? parseInt(e.target.value) : null });
      this.addFilterVisualFeedback(e.target);
    });
    
    // Sort select with smooth animation
    document.getElementById('sort-apartments')?.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.applySorting();
      this.addFilterVisualFeedback(e.target);
    });
    
    // Clear filters button with animation
    document.getElementById('clear-filters')?.addEventListener('click', (e) => {
      e.target.style.transform = 'scale(0.95)';
      setTimeout(() => {
        e.target.style.transform = 'scale(1)';
      }, 150);
      this.clearFilters();
    });
  }
  
  addFilterVisualFeedback(element) {
    if (element.value) {
      element.style.borderColor = '#d4af37';
      element.style.backgroundColor = '#fffbf0';
    } else {
      element.style.borderColor = '#e6e6e6';
      element.style.backgroundColor = '#ffffff';
    }
  }
  
  applyFilters(newFilters) {
    this.currentFilters = { ...this.currentFilters, ...newFilters };
    this.filteredApartments = ApartmentUtils.filterApartments(this.apartments, this.currentFilters);
    this.applySorting();
  }
  
  applySorting() {
    this.filteredApartments = ApartmentUtils.sortApartments(this.filteredApartments, this.currentSort);
    this.renderApartments();
  }
  
  clearFilters() {
    this.currentFilters = {};
    this.currentSort = 'newest';
    this.filteredApartments = [...this.apartments];
    
    // Reset form inputs
    document.getElementById('apartment-search').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-location').value = '';
    document.getElementById('filter-price').value = '';
    document.getElementById('filter-bedrooms').value = '';
    document.getElementById('sort-apartments').value = 'newest';
    
    this.applySorting();
  }
  
  viewApartment(id) {
    window.location.href = `apartment-details.html?id=${id}`;
  }
  
  scheduleVisit(id) {
    // For now, scroll to contact section or show a modal
    const contactSection = document.querySelector('.cta_section, .contact_section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert('Please contact us to schedule a visit for this property.');
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('apartments-grid')) {
    window.apartmentManager = new ApartmentManager();
  }
});