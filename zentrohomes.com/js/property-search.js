// Property Search Functionality for Zentro Homes - Multi-Context Support
document.addEventListener('DOMContentLoaded', function () {
    // Search contexts configuration
    const searchContexts = [
        {
            prefix: 'featured',
            name: 'Featured Properties',
            gridId: 'featured-apartments-grid'
        },
        {
            prefix: 'all',
            name: 'All Properties', 
            gridId: 'all-apartments-grid'
        }
    ];

    // Initialize each search context
    searchContexts.forEach(context => {
        initializeSearchContext(context);
    });

    function initializeSearchContext(context) {
        const prefix = context.prefix;
        
        // Get elements for this context
        const searchButton = document.getElementById(`${prefix}-search-button`);
        const searchTabs = document.querySelectorAll('.property-search-tab');

        // Display elements
        const locationDisplay = document.getElementById(`${prefix}-location-display`);
        const typeDisplay = document.getElementById(`${prefix}-type-display`);
        const priceDisplay = document.getElementById(`${prefix}-price-display`);
        const bedroomsDisplay = document.getElementById(`${prefix}-bedrooms-display`);

        // Dropdown elements
        const locationDropdown = document.getElementById(`${prefix}-location-dropdown`);
        const typeDropdown = document.getElementById(`${prefix}-type-dropdown`);
        const priceDropdown = document.getElementById(`${prefix}-price-dropdown`);
        const bedroomsDropdown = document.getElementById(`${prefix}-bedrooms-dropdown`);

        // Grid element
        const gridElement = document.getElementById(context.gridId);

        // If key elements don't exist for this context, skip initialization
        if (!searchButton || !gridElement) {
            console.log(`⚠️ ${context.name} search elements not found, skipping initialization`);
            return;
        }

        console.log(`🔧 Initializing search for ${context.name}...`);

        // Current filter values for this context
        let currentFilters = {
            status: 'For Sale',
            location: '',
            type: '',
            priceMin: null,
            priceMax: null,
            bedrooms: null
        };

        // Populate dropdowns with data
        function populateDropdowns() {
            console.log(`🔧 Populating dropdowns for ${context.name}...`);
            
            // Populate locations dropdown
            const locations = apartmentsData?.filters?.locations || [];
            if (locationDropdown && locations.length > 0) {
                let locationsHtml = '<div class="dropdown-item" data-value="">Any Location</div>';
                locations.forEach(location => {
                    locationsHtml += `<div class="dropdown-item" data-value="${location}">${location}</div>`;
                });
                locationDropdown.innerHTML = locationsHtml;
                console.log(`✅ ${context.name} location dropdown populated with`, locations.length, 'items');
                addDropdownItemEvents(locationDropdown, 'location');
            } else {
                console.warn(`⚠️ ${context.name} location dropdown not populated - using fallback`);
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
                console.log(`✅ ${context.name} type dropdown populated with`, types.length, 'items');
                addDropdownItemEvents(typeDropdown, 'type');
            } else {
                console.warn(`⚠️ ${context.name} type dropdown not populated - using fallback`);
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
                console.log(`✅ ${context.name} price dropdown populated with`, priceRanges.length, 'items');
                addDropdownItemEvents(priceDropdown, 'price');
            } else {
                console.warn(`⚠️ ${context.name} price dropdown not populated - using fallback`);
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
                console.log(`✅ ${context.name} bedrooms dropdown populated with`, bedrooms.length, 'items');
                addDropdownItemEvents(bedroomsDropdown, 'bedrooms');
            } else {
                console.warn(`⚠️ ${context.name} bedrooms dropdown not populated - using fallback`);
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
            console.log(`🔍 Performing search for ${context.name}:`, currentFilters);
            
            // Create filters object from current values
            const filters = { ...currentFilters };

            // If modernApartmentManager exists, use it to filter apartments
            if (window.modernApartmentManager) {
                // Set the target grid for this context
                window.modernApartmentManager.setTargetGrid(context.gridId);
                window.modernApartmentManager.applyFilters(filters);
                animateSearchButton();
            } else {
                console.warn(`modernApartmentManager not found. ${context.name} search functionality may not work properly.`);
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

        // Handle tab switching (shared across contexts but update this context's filters)
        function handleTabClick(e) {
            // Remove active class from all tabs in this context
            const contextTabs = e.target.closest('.property-search-container').querySelectorAll('.property-search-tab');
            contextTabs.forEach(tab => tab.classList.remove('active'));

            // Add active class to clicked tab
            e.target.classList.add('active');

            // Update status filter for this context
            currentFilters.status = e.target.getAttribute('data-status');
            console.log(`📊 ${context.name} status filter updated:`, currentFilters.status);
        }

        // Handle dropdown item selection
        function handleDropdownItemClick(e, fieldType, dropdown) {
            const value = e.target.getAttribute('data-value');
            const displayText = e.target.textContent;
            const displayElement = document.getElementById(`${prefix}-${fieldType}-display`);

            console.log(`🎯 ${context.name} dropdown item clicked:`, {
                fieldType,
                value,
                displayText,
                displayElementId: `${prefix}-${fieldType}-display`,
                displayElementFound: !!displayElement
            });

            if (!displayElement) {
                console.error(`❌ ${context.name} display element not found:`, `${prefix}-${fieldType}-display`);
                return;
            }

            // Update display text
            displayElement.textContent = displayText;
            console.log(`✅ ${context.name} display text updated:`, displayText);

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

            // Auto-close dropdown after selection
            closeAllDropdowns();
        }

        // Function to close all dropdowns in this context
        function closeAllDropdowns() {
            const contextContainer = document.getElementById(`${prefix}-search-button`)?.closest('.property-search-container');
            if (contextContainer) {
                const dropdowns = contextContainer.querySelectorAll('.search-dropdown');
                dropdowns.forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
                
                // Remove active state from search fields in this context
                const searchFields = contextContainer.querySelectorAll('.search-field');
                searchFields.forEach(field => {
                    field.classList.remove('active');
                });
            }
        }

        // Function to toggle dropdown for mobile/click interactions
        function toggleDropdown(searchField, dropdown) {
            const isCurrentlyOpen = dropdown.classList.contains('show');
            
            console.log(`🔍 ${context.name} toggle dropdown:`, {
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
                
                console.log(`✅ ${context.name} dropdown opened:`, {
                    dropdown: dropdown.id || 'unknown',
                    hasShowClass: dropdown.classList.contains('show')
                });
            }
        }

        // Helper function to add click events to dropdown items
        function addDropdownItemEvents(dropdown, fieldType) {
            const items = dropdown.querySelectorAll('.dropdown-item');
            console.log(`🔗 Adding ${items.length} event listeners to ${context.name} ${fieldType} dropdown`);
            
            items.forEach(item => {
                item.addEventListener('click', (e) => {
                    console.log(`🎯 ${context.name} ${fieldType} item clicked:`, e.target.textContent);
                    e.preventDefault();
                    e.stopPropagation();
                    handleDropdownItemClick(e, fieldType, dropdown);
                });
            });
        }

        // Add event listeners for this context
        function bindEvents() {
            // Search button click
            searchButton.addEventListener('click', handleSearch);

            // Tab clicks (find tabs within this context)
            const contextContainer = searchButton.closest('.property-search-container');
            if (contextContainer) {
                const contextTabs = contextContainer.querySelectorAll('.property-search-tab');
                contextTabs.forEach(tab => {
                    tab.addEventListener('click', handleTabClick);
                });

                // Add click handlers to search fields for dropdown toggle
                const searchFields = contextContainer.querySelectorAll('.search-field');
                console.log(`🔍 Found ${searchFields.length} search fields for ${context.name}`);
                
                searchFields.forEach(field => {
                    const dropdown = field.querySelector('.search-dropdown');
                    console.log(`🔍 ${context.name} search field setup:`, {
                        field: field.className,
                        hasDropdown: !!dropdown,
                        dropdownId: dropdown?.id || 'none'
                    });
                    
                    field.addEventListener('click', (e) => {
                        console.log(`🖱️ ${context.name} search field clicked:`, field.className);
                        e.stopPropagation();
                        if (dropdown) {
                            toggleDropdown(field, dropdown);
                        } else {
                            console.warn(`⚠️ No dropdown found for ${context.name} field:`, field.className);
                        }
                    });
                });

                // Close dropdowns when clicking outside (context-specific)
                document.addEventListener('click', (e) => {
                    if (!e.target.closest('.property-search-container') || 
                        !contextContainer.contains(e.target)) {
                        closeAllDropdowns();
                    }
                });
            }
        }

        // Initialize this context
        populateDropdowns();
        bindEvents();
        
        console.log(`✅ ${context.name} search initialized successfully`);
    }
});