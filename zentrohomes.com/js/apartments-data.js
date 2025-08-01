// Apartment data for Zentro Homes - will load from database or fallback to empty array
const apartmentsData = {
  apartments: [
    // Properties will be loaded from the database via the admin panel
    // This array serves as a fallback when no properties are available
  ],
  
  filters: {
    types: ["Villa", "Apartment", "Penthouse", "Condo"],
    statuses: ["For Sale", "For Rent"],
    locations: ["Kilimani", "Westlands", "Lavington", "Kileleshwa", "Parklands", "Runda"],
    priceRanges: [
      { min: 0, max: 50000000, label: "Under KES 50M" },
      { min: 50000000, max: 100000000, label: "KES 50M - 100M" },
      { min: 100000000, max: 200000000, label: "KES 100M - 200M" },
      { min: 200000000, max: 9999999999, label: "Above KES 200M" }
    ],
    bedrooms: [1, 2, 3, 4, 5, 6, 7, 8],
    amenities: ["Swimming Pool", "Garden", "Security", "Parking", "Modern Kitchen", "Balcony", "Roof Terrace", "City View", "Elevator", "Smart Home", "Eco-Friendly", "Air Conditioning"]
  }
};

// Utility functions
const ApartmentUtils = {
  formatPrice: (price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  },
  
  filterApartments: (apartments, filters) => {
    return apartments.filter(apartment => {
      // Type filter
      if (filters.type && apartment.type !== filters.type) return false;
      
      // Status filter
      if (filters.status && apartment.status !== filters.status) return false;
      
      // Location filter
      if (filters.location && apartment.location.area !== filters.location) return false;
      
      // Price range filter
      if (filters.priceMin && apartment.price < filters.priceMin) return false;
      if (filters.priceMax && apartment.price > filters.priceMax) return false;
      
      // Bedrooms filter
      if (filters.bedrooms && apartment.features.bedrooms !== filters.bedrooms) return false;
      
      // Search term filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = `${apartment.title} ${apartment.description} ${apartment.location.area} ${apartment.location.city}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) return false;
      }
      
      return true;
    });
  },
  
  sortApartments: (apartments, sortBy) => {
    const sorted = [...apartments];
    
    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'newest':
        return sorted.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
      case 'bedrooms-high':
        return sorted.sort((a, b) => b.features.bedrooms - a.features.bedrooms);
      case 'bedrooms-low':
        return sorted.sort((a, b) => a.features.bedrooms - b.features.bedrooms);
      case 'size-high':
        return sorted.sort((a, b) => b.features.size - a.features.size);
      case 'size-low':
        return sorted.sort((a, b) => a.features.size - b.features.size);
      default:
        return sorted;
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { apartmentsData, ApartmentUtils };
}