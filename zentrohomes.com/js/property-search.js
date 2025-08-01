// Property Search Functionality for Zentro Homes - Zillow Style
document.addEventListener('DOMContentLoaded', function () {
    // Initialize search functionality if search elements exist
    const searchButton = document.getElementById('search-button');
    const searchTabs = document.querySelectorAll('.property-search-tab');

    // Display elements
    const locationDisplay = document.getElementById('location-display');
    const typeDisplay = document.getElementById('type-display');
    const priceDisplay = document.getElementById('price-display');
    const bedroomsDisplay = document.getElementById('bedrooms-display');

    // Dropdown elements
    const locationDropdown = document.getElementById('location-dropdown');
    const typeDropdown = document.getElementById('type-dropdown');
    const priceDropdown = document.getElementById('price-dropdown');
    const bedroomsDropdown = document.getElementById('bedrooms-dropdown');

    // Current filter values
    let currentFilters = {
        status: 'For Sale',
        location: '',
        type: '',
        priceMin: null,
        priceMax: null,
        bedrooms: null
    };

    // If search elements don't exist, exit early
    if (!searchButton) {
        console.warn('Search button not found. Search functionality may not work properly.');
        return;
    }

    // Populate dropdowns with data from apartmentsData
    function populateDropdowns() {
        // Populate locations dropdown
        if (locationDropdown && apartmentsData && apartmentsData.filters && apartmentsData.filters.locations) {
            let locationsHtml = '<div class="dropdown-item" data-value="">Any Location</div>';
            apartmentsData.filters.locations.forEach(location => {
                locationsHtml += `<div class="dropdown-item" data-value="${location}">${location}</div>`;
            });
            locationDropdown.innerHTML = locationsHtml;
        }

        // Populate property types dropdown
        if (typeDropdown && apartmentsData && apartmentsData.filters && apartmentsData.filters.types) {
            let typesHtml = '<div class="dropdown-item" data-value="">Any Type</div>';
            apartmentsData.filters.types.forEach(type => {
                typesHtml += `<div class="dropdown-item" data-value="${type}">${type}</div>`;
            });
            typeDropdown.innerHTML = typesHtml;
        }

        // Populate price ranges dropdown
        if (priceDropdown && apartmentsData && apartmentsData.filters && apartmentsData.filters.priceRanges) {
            let pricesHtml = '<div class="dropdown-item" data-value="">Any Price</div>';
            apartmentsData.filters.priceRanges.forEach(range => {
                pricesHtml += `<div class="dropdown-item" data-value="${range.min}-${range.max}">${range.label}</div>`;
            });
            priceDropdown.innerHTML = pricesHtml;
        }

        // Populate bedrooms dropdown
        if (bedroomsDropdown && apartmentsData && apartmentsData.filters && apartmentsData.filters.bedrooms) {
            let bedroomsHtml = '<div class="dropdown-item" data-value="">Any</div>';
            apartmentsData.filters.bedrooms.forEach(count => {
                bedroomsHtml += `<div class="dropdown-item" data-value="${count}">${count}${count === 8 ? '+' : ''} Beds</div>`;
            });
            bedroomsDropdown.innerHTML = bedroomsHtml;
        }
    }

    // Handle search functionality
    function handleSearch() {
        // Create filters object from current values
        const filters = { ...currentFilters };

        // If modernApartmentManager exists, use it to filter apartments
        if (window.modernApartmentManager) {
            window.modernApartmentManager.applyFilters(filters);
            animateSearchButton();
        } else {
            console.warn('modernApartmentManager not found. Search functionality may not work properly.');
        }
    }

    // Animate search button when clicked
    function animateSearchButton() {
        searchButton.style.transform = 'scale(0.95)';

        setTimeout(() => {
            searchButton.style.transform = 'scale(1.05)';

            setTimeout(() => {
                searchButton.style.transform = '';
            }, 200);
        }, 100);
    }

    // Handle tab switching
    function handleTabClick(e) {
        // Remove active class from all tabs
        searchTabs.forEach(tab => tab.classList.remove('active'));

        // Add active class to clicked tab
        e.target.classList.add('active');

        // Update status filter
        currentFilters.status = e.target.getAttribute('data-status');
    }

    // Handle dropdown item selection
    function handleDropdownItemClick(e, fieldType, dropdown) {
        const value = e.target.getAttribute('data-value');
        const displayText = e.target.textContent;
        const displayElement = document.getElementById(`${fieldType}-display`);

        if (!displayElement) return;

        // Update display text
        displayElement.textContent = displayText;

        // Update filter values
        switch (fieldType) {
            case 'location':
                currentFilters.location = value;
                break;
            case 'type':
                currentFilters.type = value;
                break;
            case 'price':
                if (value) {
                    const [min, max] = value.split('-').map(Number);
                    currentFilters.priceMin = min;
                    currentFilters.priceMax = max;
                } else {
                    currentFilters.priceMin = null;
                    currentFilters.priceMax = null;
                }
                break;
            case 'bedrooms':
                currentFilters.bedrooms = value ? parseInt(value) : null;
                break;
        }

        // Add selected class to the clicked item and remove from others
        if (dropdown) {
            dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            e.target.classList.add('selected');
        }

        // Add animation to show field was updated
        const fieldElement = e.target.closest('.search-field');
        if (fieldElement) {
            fieldElement.classList.add('field-updated');
            setTimeout(() => {
                fieldElement.classList.remove('field-updated');
            }, 500);
        }
    }

    // Add event listeners
    function bindEvents() {
        // Search button click
        searchButton.addEventListener('click', handleSearch);

        // Tab clicks
        searchTabs.forEach(tab => {
            tab.addEventListener('click', handleTabClick);
        });

        // Add click events to dropdown items in location dropdown
        if (locationDropdown) {
            locationDropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    handleDropdownItemClick(e, 'location', locationDropdown);
                });
            });
        }

        // Add click events to dropdown items in type dropdown
        if (typeDropdown) {
            typeDropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    handleDropdownItemClick(e, 'type', typeDropdown);
                });
            });
        }

        // Add click events to dropdown items in price dropdown
        if (priceDropdown) {
            priceDropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    handleDropdownItemClick(e, 'price', priceDropdown);
                });
            });
        }

        // Add click events to dropdown items in bedrooms dropdown
        if (bedroomsDropdown) {
            bedroomsDropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    handleDropdownItemClick(e, 'bedrooms', bedroomsDropdown);
                });
            });
        }
    }

    // Initialize
    populateDropdowns();
    bindEvents();
});