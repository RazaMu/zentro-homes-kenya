// Force CSS refresh to ensure styling changes are applied
document.addEventListener('DOMContentLoaded', function () {
    // Add a timestamp parameter to CSS files to force browser to reload them
    const timestamp = new Date().getTime();
    const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');

    cssLinks.forEach(link => {
        const currentHref = link.getAttribute('href');
        if (currentHref && currentHref.includes('.css')) {
            link.setAttribute('href', `${currentHref}?v=${timestamp}`);
        }
    });
    
    // Add responsive viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
        const viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        viewportMeta.content = 'width=device-width, initial-scale=1.0, user-scalable=0';
        document.head.appendChild(viewportMeta);
    }

    // Apply comprehensive fixes for apartment details styling
    setTimeout(() => {
        // Fix property header layout
        const propertyHeader = document.querySelector('.property-header');
        if (propertyHeader) {
            // Force a repaint by toggling a class
            propertyHeader.classList.add('layout-fixed');
        }
        
        // Fix property subtitle layout
        const propertySubtitle = document.querySelector('.property-subtitle');
        if (propertySubtitle) {
            propertySubtitle.style.display = 'grid';
            propertySubtitle.style.gridTemplateColumns = '1fr auto';
            
            // Ensure the property location is properly positioned
            const propertyLocation = document.querySelector('.property-location');
            if (propertyLocation) {
                propertyLocation.style.gridColumn = '1 / -1';
                propertyLocation.style.width = '100%';
                
                // Make sure the SVG icon is properly aligned
                const svg = propertyLocation.querySelector('svg');
                if (svg) {
                    svg.style.flexShrink = '0';
                    svg.style.width = '20px';
                    svg.style.height = '20px';
                    svg.style.minWidth = '20px';
                }
                
                // Make sure the text is properly displayed
                const span = propertyLocation.querySelector('span');
                if (span) {
                    span.style.display = 'inline-block';
                    span.style.wordBreak = 'break-word';
                }
            }
            
            // Ensure the property price is properly positioned
            const propertyPrice = document.querySelector('.property-price');
            if (propertyPrice) {
                propertyPrice.style.gridColumn = '1';
                propertyPrice.style.justifySelf = 'start';
            }
            
            // Ensure the property status is properly positioned
            const propertyStatus = document.querySelector('.property-status');
            if (propertyStatus) {
                propertyStatus.style.gridColumn = '2';
                propertyStatus.style.justifySelf = 'end';
            }
        }
        
        // Fix property features
        const featureItems = document.querySelectorAll('.feature-item');
        featureItems.forEach(item => {
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '12px';
            
            // Make sure SVG icons are properly aligned
            const svg = item.querySelector('svg');
            if (svg) {
                svg.style.flexShrink = '0';
                svg.style.color = 'var(--primary-color)';
                svg.style.width = '20px';
                svg.style.height = '20px';
                svg.style.minWidth = '20px';
            }
            
            // Make sure text is properly displayed
            const span = item.querySelector('span');
            if (span) {
                span.style.display = 'inline-block';
                span.style.wordBreak = 'break-word';
            }
        });
        
        // Fix similar properties
        const similarPropertyCards = document.querySelectorAll('.similar-property-card');
        similarPropertyCards.forEach(card => {
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            
            // Fix location display
            const location = card.querySelector('.similar-property-location');
            if (location) {
                location.style.display = 'flex';
                location.style.alignItems = 'center';
                location.style.gap = '6px';
                
                const svg = location.querySelector('svg');
                if (svg) {
                    svg.style.flexShrink = '0';
                    svg.style.color = 'var(--primary-color)';
                    svg.style.width = '14px';
                    svg.style.height = '14px';
                    svg.style.minWidth = '14px';
                }
                
                const span = location.querySelector('span');
                if (span) {
                    span.style.display = 'inline-block';
                    span.style.wordBreak = 'break-word';
                }
            }
        });
        
        // Force a repaint of the entire page to ensure styles are applied
        document.body.style.display = 'none';
        document.body.offsetHeight; // Trigger a reflow
        document.body.style.display = '';
        
        console.log('Apartment details styling fixed');
    }, 200);
    
    // Add responsive behavior for mobile navigation
    const headerToggle = document.querySelector('.header_toggle');
    const headerNavbar = document.querySelector('.header_navbar');
    const hasSubmenuItems = document.querySelectorAll('.has_submenu');
    
    if (headerToggle && headerNavbar) {
        headerToggle.addEventListener('click', function() {
            headerNavbar.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (headerNavbar.classList.contains('active') && 
                !headerNavbar.contains(event.target) && 
                !headerToggle.contains(event.target)) {
                headerNavbar.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
    }
    
    // Add submenu toggle for mobile
    if (hasSubmenuItems.length > 0) {
        hasSubmenuItems.forEach(item => {
            const link = item.querySelector('a');
            if (link) {
                link.addEventListener('click', function(e) {
                    // Only handle submenu toggle on mobile
                    if (window.innerWidth <= 767) {
                        e.preventDefault();
                        item.classList.toggle('active');
                    }
                });
            }
        });
    }
    
    // Handle responsive image loading
    const handleResponsiveImages = () => {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            const isMobile = window.innerWidth <= 767;
            const src = isMobile ? img.getAttribute('data-mobile-src') : img.getAttribute('data-src');
            if (src) {
                img.src = src;
            }
        });
    };
    
    // Call once on load and on resize
    handleResponsiveImages();
    window.addEventListener('resize', handleResponsiveImages);

    console.log('Styles refreshed to ensure consistent appearance');
});