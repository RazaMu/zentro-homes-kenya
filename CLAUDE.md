# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Zentro Homes website - a real estate company website built with vanilla HTML, CSS, and JavaScript. The website showcases property listings, company information, and provides contact functionality for a Kenyan-based real estate company.

## Architecture and Structure

### Core Components
- **Frontend**: Pure HTML/CSS/JavaScript (no build system required)
- **Property Data**: JavaScript-based data management with mock apartment data
- **Styling**: Modular CSS architecture with specialized stylesheets
- **Admin Interface**: Basic admin panel for property management

### Key Directories
- `zentrohomes.com/` - Main website files
  - `css/` - Modular stylesheets for different sections
  - `js/` - JavaScript modules for functionality
  - `wp-content/` - WordPress-style asset organization (images, themes)
  - Multiple HTML pages for different sections (about, contact, etc.)

### Data Management
- Property data can be managed in two modes:
  - **Database Mode**: Using Railway PostgreSQL database (recommended for production)
  - **Offline Mode**: Using localStorage and static data (fallback)
- Core files:
  - `js/apartments-data.js` - Fallback/sample property data
  - `js/railway-config.js` - Railway client configuration
  - `js/railway-data-manager.js` - Database-integrated data manager  
  - `js/admin.js` - Admin interface with database support
- Property images are stored in `wp-content/uploads/2025/02/`

### JavaScript Architecture
- `apartments-data.js` - Mock property data definitions and fallback data
- `railway-config.js` - Railway database configuration and client setup
- `railway-data-manager.js` - Database-integrated data management layer
- `admin.js` - Admin panel with database CRUD operations
- `modern-apartments.js` - Property display logic
- `property-search.js` - Search and filtering functionality
- `dynamic-text.js` - Text animations and effects
- `touch-interactions.js` - Mobile interaction handling

### CSS Architecture
- `consolidated-apartments.css` - Property listing styles
- `company-sections.css` - Company information sections
- `contact-form.css` - Contact form styling
- `responsive.css` - Mobile responsiveness
- `custom-adjustments.css` - Site-specific overrides

## Development Workflow

### No Build Process Required
This is a static website with no compilation step. Changes to HTML, CSS, or JavaScript files are immediately visible when the files are served.

### Testing
- Manual testing by opening HTML files in browsers
- Test responsive design across different screen sizes
- Verify JavaScript functionality in browser console

### File Organization
- Keep HTML files in root or appropriate subdirectories
- CSS files organized by functionality in `/css/` directory
- JavaScript modules in `/js/` directory
- Images and assets in `/wp-content/uploads/` following WordPress conventions

## Working with Properties

### Adding New Properties
- Modify `js/apartments-data.js` to add new property data
- Ensure images are properly referenced in `wp-content/uploads/`
- Properties support multiple images, videos, and detailed metadata

### Property Data Structure
Properties include: id, title, type, status, price, location, features (bedrooms, bathrooms, etc.), description, images, videos, amenities, and other metadata.

### Admin Functionality
- Professional admin interface available at `/admin/index.html`
- Database-integrated property management with Railway
- Features: Add/Edit/Delete properties, Search/Filter, Media management, Dashboard statistics
- Fallback to localStorage when database is unavailable
- Real-time data synchronization between admin and public website

## Important Notes

### File Paths
- Use relative paths for internal resources
- Images follow WordPress-style organization in `/wp-content/uploads/`
- External CDN resources (fonts, icons) are linked directly

### Mobile Responsiveness
- Site uses responsive CSS with mobile-first approach
- Touch interactions handled separately in `touch-interactions.js`
- Test across different screen sizes

### Contact Forms
- Contact functionality is styled but may need backend integration
- Form styling is in `contact-form.css`

### Language Support
- Basic language switching UI implemented (English/Somali)
- Translation functionality exists in `translations.js`

## Railway Database Integration

### Setup Process
1. **Complete Setup Guide**: Follow `RAILWAY_IMPLEMENTATION_GUIDE.md` for comprehensive instructions
2. **Configuration**: Update `js/railway-config.js` with your project credentials:
   - Replace `RAILWAY_CONFIG.connectionUrl` with your Railway PostgreSQL URL
   - Update connection parameters as needed
3. **Database Schema**: Use provided SQL commands to create the properties table
4. **Testing**: Admin panel will show connection status on load

### Database Schema
The properties table includes these fields:
- Basic info: id, title, type, status, price, currency
- Location: location_area, location_city, location_country, coordinates
- Features: bedrooms, bathrooms, parking, size, size_unit
- Content: description, main_image, gallery_images, amenities
- Metadata: year_built, furnished, available, created_at, updated_at

### Development vs Production
- **Development**: Configure credentials directly in `railway-config.js`
- **Production**: Use environment variables and secure deployment practices
- **Fallback**: System gracefully handles offline mode with localStorage

### Data Flow
1. Admin panel connects to Railway for CRUD operations
2. Main website loads properties from database via shared data manager
3. Real-time updates reflect immediately across both interfaces
4. Automatic fallback to local data if database is unavailable