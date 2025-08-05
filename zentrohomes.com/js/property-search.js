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
        console.log('🔧 Populating dropdowns...');
        console.log('🔍 Available data:', {
            apartmentsData: !!apartmentsData,
            filters: !!apartmentsData?.filters,
            sharedDataManager: !!window.sharedDataManager
        });
        
        // Populate locations dropdown
        const locations = apartmentsData?.filters?.locations || [];
        if (locationDropdown && locations.length > 0) {
            let locationsHtml = '<div class="dropdown-item" data-value="">Any Location</div>';
            locations.forEach(location => {
                locationsHtml += `<div class="dropdown-item" data-value="${location}">${location}</div>`;
            });
            locationDropdown.innerHTML = locationsHtml;
            console.log('✅ Location dropdown populated with', locations.length, 'items');
            addDropdownItemEvents(locationDropdown, 'location');
        } else {
            console.warn('⚠️ Location dropdown not populated - using fallback');
            if (locationDropdown) {
                locationDropdown.innerHTML = `
                    <div class="dropdown-item" data-value="">Any Location</div>
                    <div class="dropdown-item" data-value="Kilimani">Kilimani</div>
                    <div class="dropdown-item" data-value="Westlands">Westlands</div>
                    <div class="dropdown-item" data-value="Lavington">Lavington</div>
                    <div class="dropdown-item" data-value="Parklands">Parklands</div>
                `;
                addDropdownItemEvents(locationDropdown, 'location');
            }
        }

        // Populate property types dropdown
        const types = apartmentsData?.filters?.types || [];
        if (typeDropdown && types.length > 0) {
            let typesHtml = '<div class="dropdown-item" data-value="">Any Type</div>';
            types.forEach(type => {
                typesHtml += `<div class="dropdown-item" data-value="${type}">${type}</div>`;
            });
            typeDropdown.innerHTML = typesHtml;
            console.log('✅ Type dropdown populated with', types.length, 'items');
            addDropdownItemEvents(typeDropdown, 'type');
        } else {
            console.warn('⚠️ Type dropdown not populated - using fallback');
            if (typeDropdown) {
                typeDropdown.innerHTML = `
                    <div class="dropdown-item" data-value="">Any Type</div>
                    <div class="dropdown-item" data-value="Villa">Villa</div>
                    <div class="dropdown-item" data-value="Apartment">Apartment</div>
                    <div class="dropdown-item" data-value="Penthouse">Penthouse</div>
                    <div class="dropdown-item" data-value="Condo">Condo</div>
                `;
                addDropdownItemEvents(typeDropdown, 'type');
            }
        }

        // Populate price ranges dropdown
        const priceRanges = apartmentsData?.filters?.priceRanges || [];
        if (priceDropdown && priceRanges.length > 0) {
            let pricesHtml = '<div class="dropdown-item" data-value="">Any Price</div>';
            priceRanges.forEach(range => {
                pricesHtml += `<div class="dropdown-item" data-value="${range.min}-${range.max}">${range.label}</div>`;
            });
            priceDropdown.innerHTML = pricesHtml;
            console.log('✅ Price dropdown populated with', priceRanges.length, 'items');
            addDropdownItemEvents(priceDropdown, 'price');
        } else {
            console.warn('⚠️ Price dropdown not populated - using fallback');
            if (priceDropdown) {
                priceDropdown.innerHTML = `
                    <div class="dropdown-item" data-value="">Any Price</div>
                    <div class="dropdown-item" data-value="0-50000000">Under KES 50M</div>
                    <div class="dropdown-item" data-value="50000000-100000000">KES 50M - 100M</div>
                    <div class="dropdown-item" data-value="100000000-200000000">KES 100M - 200M</div>
                    <div class="dropdown-item" data-value="200000000-9999999999">Above KES 200M</div>
                `;
                addDropdownItemEvents(priceDropdown, 'price');
            }
        }

        // Populate bedrooms dropdown
        const bedrooms = apartmentsData?.filters?.bedrooms || [];
        if (bedroomsDropdown && bedrooms.length > 0) {
            let bedroomsHtml = '<div class="dropdown-item" data-value="">Any</div>';
            bedrooms.forEach(count => {
                bedroomsHtml += `<div class="dropdown-item" data-value="${count}">${count}${count === 8 ? '+' : ''} Beds</div>`;
            });
            bedroomsDropdown.innerHTML = bedroomsHtml;
            console.log('✅ Bedrooms dropdown populated with', bedrooms.length, 'items');
            addDropdownItemEvents(bedroomsDropdown, 'bedrooms');
        } else {
            console.warn('⚠️ Bedrooms dropdown not populated - using fallback');
            if (bedroomsDropdown) {
                bedroomsDropdown.innerHTML = `
                    <div class="dropdown-item" data-value="">Any</div>
                    <div class="dropdown-item" data-value="1">1 Beds</div>
                    <div class="dropdown-item" data-value="2">2 Beds</div>
                    <div class="dropdown-item" data-value="3">3 Beds</div>
                    <div class="dropdown-item" data-value="4">4 Beds</div>
                    <div class="dropdown-item" data-value="5">5 Beds</div>
                    <div class="dropdown-item" data-value="6">6 Beds</div>
                    <div class="dropdown-item" data-value="7">7 Beds</div>
                    <div class="dropdown-item" data-value="8">8+ Beds</div>
                `;
                addDropdownItemEvents(bedroomsDropdown, 'bedrooms');
            }
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

        console.log('🎯 Dropdown item clicked:', {
            fieldType,
            value,
            displayText,
            displayElementId: `${fieldType}-display`,
            displayElementFound: !!displayElement
        });

        if (!displayElement) {
            console.error('❌ Display element not found:', `${fieldType}-display`);
            return;
        }

        // Update display text
        displayElement.textContent = displayText;
        console.log('✅ Display text updated:', displayText);

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

        // Auto-close dropdown after selection (especially important for mobile)
        closeAllDropdowns();
    }

    // Function to close all dropdowns
    function closeAllDropdowns() {
        const allDropdowns = document.querySelectorAll('.search-dropdown');
        allDropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
        
        // Remove active state from search fields
        const allSearchFields = document.querySelectorAll('.search-field');
        allSearchFields.forEach(field => {
            field.classList.remove('active');
        });
    }

    // Function to toggle dropdown for mobile/click interactions
    function toggleDropdown(searchField, dropdown) {
        const isCurrentlyOpen = dropdown.classList.contains('show');
        
        console.log('🔍 Toggle dropdown:', {
            dropdown: dropdown.id || 'unknown',
            isCurrentlyOpen,
            classList: Array.from(dropdown.classList)
        });
        
        // Close all other dropdowns first
        closeAllDropdowns();
        
        // If the clicked dropdown wasn't open, open it
        if (!isCurrentlyOpen) {
            dropdown.classList.add('show');
            searchField.classList.add('active');
            
            console.log('✅ Dropdown opened:', {
                dropdown: dropdown.id || 'unknown',
                hasShowClass: dropdown.classList.contains('show'),
                computedStyle: window.getComputedStyle(dropdown).display
            });
        }
    }

    // Mobile detection helper
    function isMobileDevice() {
        return window.innerWidth <= 767 || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
    }

    // Helper function to add click events to dropdown items
    function addDropdownItemEvents(dropdown, fieldType) {
        const items = dropdown.querySelectorAll('.dropdown-item');
        console.log(`🔗 Adding ${items.length} event listeners to ${fieldType} dropdown`);
        
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                console.log(`🎯 DIRECT: ${fieldType} item clicked:`, e.target.textContent);
                e.preventDefault();
                e.stopPropagation();
                handleDropdownItemClick(e, fieldType, dropdown);
            });
        });
    }

    // Add event listeners
    function bindEvents() {
        // Search button click
        searchButton.addEventListener('click', handleSearch);

        // Tab clicks
        searchTabs.forEach(tab => {
            tab.addEventListener('click', handleTabClick);
        });

        // Add click handlers to search fields for mobile dropdown toggle
        const searchFields = document.querySelectorAll('.search-field');
        console.log('🔍 Found search fields:', searchFields.length);
        
        searchFields.forEach(field => {
            const dropdown = field.querySelector('.search-dropdown');
            console.log('🔍 Search field setup:', {
                field: field.className,
                hasDropdown: !!dropdown,
                dropdownId: dropdown?.id || 'none'
            });
            
            field.addEventListener('click', (e) => {
                console.log('🖱️ Search field clicked:', field.className);
                e.stopPropagation();
                if (dropdown) {
                    toggleDropdown(field, dropdown);
                } else {
                    console.warn('⚠️ No dropdown found for field:', field.className);
                }
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-field')) {
                closeAllDropdowns();
            }
        });

        // Note: Dropdown item clicks are now handled by direct event listeners
        // added in populateDropdowns() function via addDropdownItemEvents()
    }

    // Initialize
    populateDropdowns();
    
    // Debug: Check if dropdowns and display elements were created properly
    setTimeout(() => {
        console.log('🔍 Debugging dropdown and display elements:');
        
        // Check dropdowns
        const allDropdowns = document.querySelectorAll('.search-dropdown');
        console.log('All dropdowns found:', allDropdowns.length);
        
        // Check display elements
        const displayElements = [
            { id: 'location-display', name: 'Location' },
            { id: 'type-display', name: 'Type' },
            { id: 'price-display', name: 'Price' },
            { id: 'bedrooms-display', name: 'Bedrooms' }
        ];
        
        displayElements.forEach(({ id, name }) => {
            const element = document.getElementById(id);
            console.log(`${name} display element (${id}):`, {
                found: !!element,
                currentText: element?.textContent,
                tagName: element?.tagName
            });
        });
        
        // Check dropdown items
        allDropdowns.forEach(dropdown => {
            const items = dropdown.querySelectorAll('.dropdown-item');
            console.log(`${dropdown.id} has ${items.length} dropdown items`);
            if (items.length > 0) {
                console.log('First item:', items[0].textContent, 'data-value:', items[0].getAttribute('data-value'));
            }
        });
    }, 100);
    
    bindEvents();
});