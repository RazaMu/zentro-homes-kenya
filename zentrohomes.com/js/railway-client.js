/**
 * Railway API Client for Zentro Homes
 * Comprehensive client library for interacting with Railway backend APIs
 */

class RailwayClient {
  constructor() {
    // Use the correct API server URL
    this.baseUrl = 'http://localhost:3000/api';
    this.adminToken = localStorage.getItem('admin_token');
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
    
    // Initialize analytics tracking
    this.sessionId = this.generateSessionId();
    this.deviceInfo = this.getDeviceInfo();
    
    // Track page view on initialization
    this.trackPageView();
    
    console.log('🚀 Railway Client initialized');
  }

  // ================================================================================
  // UTILITY METHODS
  // ================================================================================

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getDeviceInfo() {
    const ua = navigator.userAgent;
    let device_type = 'desktop';
    let browser = 'unknown';
    let os = 'unknown';

    // Device type detection
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      device_type = 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
      device_type = 'mobile';
    }

    // Browser detection
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('Opera')) browser = 'Opera';

    // OS detection
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('X11')) os = 'UNIX';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return { device_type, browser, os };
  }

  getHeaders(includeAuth = false) {
    const headers = { ...this.defaultHeaders };
    
    if (includeAuth && this.adminToken) {
      headers['Authorization'] = `Bearer ${this.adminToken}`;
    }
    
    return headers;
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Use default error message if JSON parsing fails
        }
      }
      
      throw new Error(errorMessage);
    }
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  }

  // ================================================================================
  // ANALYTICS TRACKING
  // ================================================================================

  async trackEvent(eventType, eventData = {}) {
    try {
      const data = {
        event_type: eventType,
        page_url: window.location.href,
        session_id: this.sessionId,
        event_data: eventData,
        ...this.deviceInfo
      };

      await fetch(`${this.baseUrl}/analytics/track`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  trackPageView() {
    this.trackEvent('page_view', {
      page_title: document.title,
      url_path: window.location.pathname
    });
  }

  trackPropertyView(propertyId) {
    this.trackEvent('property_view', {
      property_id: propertyId
    });
  }

  trackSearch(searchTerm, resultsCount) {
    this.trackEvent('search', {
      search_term: searchTerm,
      results_count: resultsCount
    });
  }

  trackContactForm(propertyId = null) {
    this.trackEvent('contact_form', {
      property_id: propertyId
    });
  }

  // ================================================================================
  // PROPERTIES API
  // ================================================================================

  async getProperties(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `${this.baseUrl}/properties${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: this.getHeaders()
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  }

  async getProperty(identifier) {
    try {
      const response = await fetch(`${this.baseUrl}/properties/${identifier}`, {
        headers: this.getHeaders()
      });
      
      const data = await this.handleResponse(response);
      
      // Track property view
      if (data.property) {
        this.trackPropertyView(data.property.id);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  }

  async searchProperties(term) {
    try {
      if (!term || term.trim().length < 2) {
        throw new Error('Search term must be at least 2 characters');
      }

      const response = await fetch(`${this.baseUrl}/properties/search/${encodeURIComponent(term)}`, {
        headers: this.getHeaders()
      });
      
      const data = await this.handleResponse(response);
      
      // Track search
      this.trackSearch(term, data.results?.length || 0);
      
      return data;
    } catch (error) {
      console.error('Error searching properties:', error);
      throw error;
    }
  }

  async getFeaturedProperties(limit = 6) {
    try {
      const response = await fetch(`${this.baseUrl}/properties/featured/list?limit=${limit}`, {
        headers: this.getHeaders()
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching featured properties:', error);
      throw error;
    }
  }

  async getPropertiesByType(propertyType, limit = 12, offset = 0) {
    try {
      const response = await fetch(
        `${this.baseUrl}/properties/type/${propertyType}?limit=${limit}&offset=${offset}`,
        {
          headers: this.getHeaders()
        }
      );
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching properties by type:', error);
      throw error;
    }
  }

  async getPropertyStats() {
    try {
      const response = await fetch(`${this.baseUrl}/properties/stats/summary`, {
        headers: this.getHeaders()
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching property stats:', error);
      throw error;
    }
  }

  // ================================================================================
  // CONTACTS API
  // ================================================================================

  async submitInquiry(data) {
    try {
      const response = await fetch(`${this.baseUrl}/contacts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      
      const result = await this.handleResponse(response);
      
      // Track contact form submission
      this.trackContactForm(data.property_id);
      
      return result;
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      throw error;
    }
  }

  // ================================================================================
  // ADMIN API METHODS
  // ================================================================================

  async adminLogin(email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/admin/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password })
      });
      
      const data = await this.handleResponse(response);
      
      if (data.token) {
        this.adminToken = data.token;
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.admin));
      }
      
      return data;
    } catch (error) {
      console.error('Error during admin login:', error);
      throw error;
    }
  }

  async adminLogout() {
    try {
      if (this.adminToken) {
        await fetch(`${this.baseUrl}/admin/logout`, {
          method: 'POST',
          headers: this.getHeaders(true)
        });
      }
    } catch (error) {
      console.warn('Error during admin logout:', error);
    } finally {
      this.adminToken = null;
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    }
  }

  async verifyAdminToken() {
    try {
      if (!this.adminToken) {
        throw new Error('No admin token found');
      }

      const response = await fetch(`${this.baseUrl}/admin/verify`, {
        headers: this.getHeaders(true)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error verifying admin token:', error);
      this.adminToken = null;
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      throw error;
    }
  }

  async getDashboardStats() {
    try {
      const response = await fetch(`${this.baseUrl}/admin/dashboard/stats`, {
        headers: this.getHeaders(true)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  async getAdminProperties(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `${this.baseUrl}/admin/properties${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: this.getHeaders(true)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching admin properties:', error);
      throw error;
    }
  }

  async createProperty(propertyData) {
    try {
      // Ensure all required database fields are present
      const sanitizedData = this.sanitizePropertyData(propertyData);
      
      const response = await fetch(`${this.baseUrl}/admin/properties`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(sanitizedData)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  async updateProperty(propertyId, propertyData) {
    try {
      // Ensure all required database fields are present
      const sanitizedData = this.sanitizePropertyData(propertyData);
      
      const response = await fetch(`${this.baseUrl}/admin/properties/${propertyId}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(sanitizedData)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  }

  async deleteProperty(propertyId) {
    try {
      const response = await fetch(`${this.baseUrl}/admin/properties/${propertyId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  }

  async getContactInquiries(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const url = `${this.baseUrl}/contacts${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: this.getHeaders(true)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching contact inquiries:', error);
      throw error;
    }
  }

  async updateContactInquiry(inquiryId, updateData) {
    try {
      const response = await fetch(`${this.baseUrl}/contacts/${inquiryId}/status`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify(updateData)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating contact inquiry:', error);
      throw error;
    }
  }

  // ================================================================================
  // ANALYTICS API (Admin)
  // ================================================================================

  async getAnalyticsOverview(period = '30') {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/overview?period=${period}`, {
        headers: this.getHeaders(true)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching analytics overview:', error);
      throw error;
    }
  }

  async getPropertyAnalytics(propertyId, period = '30') {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/properties/${propertyId}?period=${period}`, {
        headers: this.getHeaders(true)
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching property analytics:', error);
      throw error;
    }
  }

  // ================================================================================
  // DATA SANITIZATION METHODS
  // ================================================================================

  sanitizePropertyData(propertyData) {
    // Sanitize and ensure all database fields are properly formatted
    const sanitized = {
      // Basic info
      title: propertyData.title || '',
      slug: propertyData.slug || this.generateSlug(propertyData.title || ''),
      uuid: propertyData.uuid || this.generateUUID(),
      type: propertyData.type || '',
      status: propertyData.status || '',
      price: parseFloat(propertyData.price) || 0,
      currency: propertyData.currency || 'KES',
      
      // Location data
      location_area: propertyData.location_area || propertyData.area || '',
      location_city: propertyData.location_city || propertyData.city || '',
      location_country: propertyData.location_country || propertyData.country || 'Kenya',
      coordinates_lat: propertyData.coordinates_lat ? parseFloat(propertyData.coordinates_lat) : null,
      coordinates_lng: propertyData.coordinates_lng ? parseFloat(propertyData.coordinates_lng) : null,
      
      // Features
      bedrooms: parseInt(propertyData.bedrooms) || 0,
      bathrooms: parseInt(propertyData.bathrooms) || 0,
      parking: parseInt(propertyData.parking) || 0,
      size: parseFloat(propertyData.size) || 0,
      size_unit: propertyData.size_unit || 'm²',
      year_built: propertyData.year_built ? parseInt(propertyData.year_built) : null,
      furnished: propertyData.furnished === true || propertyData.furnished === 'true',
      
      // Content
      description: propertyData.description || '',
      short_description: propertyData.short_description || '',
      images: this.sanitizeArrayField(propertyData.images),
      videos: this.sanitizeArrayField(propertyData.videos),
      virtual_tour_url: propertyData.virtual_tour_url || null,
      youtube_url: propertyData.youtube_url || null,
      amenities: this.sanitizeArrayField(propertyData.amenities),
      features: this.sanitizeObjectField(propertyData.features || propertyData.customFeatures),
      
      // SEO
      meta_title: propertyData.meta_title || propertyData.title || '',
      meta_description: propertyData.meta_description || propertyData.description || '',
      meta_keywords: this.sanitizeArrayField(propertyData.meta_keywords),
      
      // Status
      available: propertyData.available !== false,
      featured: propertyData.featured === true,
      published: propertyData.published !== false
    };
    
    return sanitized;
  }

  sanitizeArrayField(value) {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        // If it's a comma-separated string
        return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
      }
    }
    return [];
  }

  sanitizeObjectField(value) {
    if (typeof value === 'object' && value !== null) {
      return value;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  generateUUID() {
    return 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // ================================================================================
  // UTILITY METHODS FOR UI
  // ================================================================================

  formatPrice(price, currency = 'KES') {
    if (!price) return 'Price on request';
    
    const formatter = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return formatter.format(price);
  }

  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getImageUrl(imageObj, transformation = '') {
    if (typeof imageObj === 'string') {
      return imageObj; // Direct URL
    }
    
    if (imageObj && imageObj.url) {
      if (transformation && imageObj.url.includes('cloudinary')) {
        // Insert transformation into Cloudinary URL
        return imageObj.url.replace('/upload/', `/upload/${transformation}/`);
      }
      return imageObj.url;
    }
    
    return '/wp-content/uploads/2025/02/placeholder.jpg'; // Fallback image
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  // ================================================================================
  // INITIALIZATION AND HEALTH CHECK
  // ================================================================================

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  isAdminLoggedIn() {
    return !!this.adminToken;
  }

  getAdminUser() {
    try {
      return JSON.parse(localStorage.getItem('admin_user'));
    } catch (error) {
      return null;
    }
  }
}

// Initialize global client
const railwayClient = new RailwayClient();

// Make it globally available
window.railwayClient = railwayClient;
window.RailwayClient = RailwayClient;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RailwayClient;
}

console.log('✅ Railway Client SDK loaded successfully');