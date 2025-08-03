const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get all properties with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      type, 
      status, 
      location, 
      location_city,
      location_area,
      min_price, 
      max_price, 
      bedrooms, 
      bathrooms,
      min_size,
      max_size,
      furnished,
      featured,
      available,
      published,
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    let query = `
      SELECT 
        id, uuid, title, slug, type, status, price, currency,
        location_area, location_city, location_country,
        coordinates_lat, coordinates_lng,
        bedrooms, bathrooms, parking, size, size_unit,
        year_built, furnished, description, short_description,
        images, videos, virtual_tour_url, amenities, features,
        meta_title, meta_description, meta_keywords,
        available, featured, published, views_count,
        created_at, updated_at, published_at, youtube_url
      FROM properties 
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Apply filters
    if (type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(type);
    }
    
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }
    
    if (location) {
      paramCount++;
      query += ` AND (location_city ILIKE $${paramCount} OR location_area ILIKE $${paramCount})`;
      params.push(`%${location}%`);
    }
    
    if (location_city) {
      paramCount++;
      query += ` AND location_city ILIKE $${paramCount}`;
      params.push(`%${location_city}%`);
    }
    
    if (location_area) {
      paramCount++;
      query += ` AND location_area ILIKE $${paramCount}`;
      params.push(`%${location_area}%`);
    }
    
    if (min_price) {
      paramCount++;
      query += ` AND price >= $${paramCount}`;
      params.push(parseInt(min_price));
    }
    
    if (max_price) {
      paramCount++;
      query += ` AND price <= $${paramCount}`;
      params.push(parseInt(max_price));
    }
    
    if (bedrooms) {
      paramCount++;
      query += ` AND bedrooms = $${paramCount}`;
      params.push(parseInt(bedrooms));
    }
    
    if (bathrooms) {
      paramCount++;
      query += ` AND bathrooms = $${paramCount}`;
      params.push(parseInt(bathrooms));
    }
    
    if (min_size) {
      paramCount++;
      query += ` AND size >= $${paramCount}`;
      params.push(parseInt(min_size));
    }
    
    if (max_size) {
      paramCount++;
      query += ` AND size <= $${paramCount}`;
      params.push(parseInt(max_size));
    }
    
    if (furnished !== undefined) {
      paramCount++;
      query += ` AND furnished = $${paramCount}`;
      params.push(furnished === 'true');
    }
    
    if (featured !== undefined) {
      paramCount++;
      query += ` AND featured = $${paramCount}`;
      params.push(featured === 'true');
    }
    
    if (available !== undefined) {
      paramCount++;
      query += ` AND available = $${paramCount}`;
      params.push(available === 'true');
    }
    
    if (published !== undefined) {
      paramCount++;
      query += ` AND published = $${paramCount}`;
      params.push(published === 'true');
    } else {
      // Default to only published properties for public API
      query += ` AND published = true`;
    }
    
    // Add sorting
    const allowedSortFields = ['created_at', 'updated_at', 'price', 'title', 'views_count', 'bedrooms', 'size'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortDirection}, featured DESC`;
    
    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM properties WHERE 1=1`;
    const countParams = [];
    let countParamCount = 0;
    
    // Apply same filters for count
    if (type) {
      countParamCount++;
      countQuery += ` AND type = $${countParamCount}`;
      countParams.push(type);
    }
    
    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }
    
    if (published !== undefined) {
      countParamCount++;
      countQuery += ` AND published = $${countParamCount}`;
      countParams.push(published === 'true');
    } else {
      countQuery += ` AND published = true`;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      properties: result.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasNext: parseInt(offset) + parseInt(limit) < totalCount,
        hasPrev: parseInt(offset) > 0
      }
    });
    
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get property by ID or slug
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    let query;
    if (isNaN(identifier)) {
      // It's a slug
      query = `
        SELECT 
          id, uuid, title, slug, type, status, price, currency,
          location_area, location_city, location_country,
          coordinates_lat, coordinates_lng,
          bedrooms, bathrooms, parking, size, size_unit,
          year_built, furnished, description, short_description,
          images, videos, virtual_tour_url, amenities, features,
          meta_title, meta_description, meta_keywords,
          available, featured, published, views_count,
          created_at, updated_at, published_at, youtube_url
        FROM properties 
        WHERE slug = $1 AND published = true AND available = true
      `;
    } else {
      // It's an ID
      query = `
        SELECT 
          id, uuid, title, slug, type, status, price, currency,
          location_area, location_city, location_country,
          coordinates_lat, coordinates_lng,
          bedrooms, bathrooms, parking, size, size_unit,
          year_built, furnished, description, short_description,
          images, videos, virtual_tour_url, amenities, features,
          meta_title, meta_description, meta_keywords,
          available, featured, published, views_count,
          created_at, updated_at, published_at, youtube_url
        FROM properties 
        WHERE id = $1 AND published = true AND available = true
      `;
    }
    
    const result = await pool.query(query, [identifier]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Update view count
    await pool.query(
      'UPDATE properties SET views_count = views_count + 1 WHERE id = $1', 
      [result.rows[0].id]
    );
    
    // Get related properties (same type and location)
    const relatedQuery = `
      SELECT 
        id, uuid, title, slug, type, status, price, currency,
        location_area, location_city, bedrooms, bathrooms, 
        size, images, featured, created_at
      FROM properties 
      WHERE type = $1 
        AND location_city = $2 
        AND id != $3 
        AND published = true 
        AND available = true
      ORDER BY featured DESC, created_at DESC
      LIMIT 4
    `;
    
    const relatedResult = await pool.query(relatedQuery, [
      result.rows[0].type,
      result.rows[0].location_city,
      result.rows[0].id
    ]);
    
    res.json({
      property: result.rows[0],
      related: relatedResult.rows
    });
    
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Search properties using full-text search
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    if (!term || term.trim().length < 2) {
      return res.status(400).json({ error: 'Search term must be at least 2 characters' });
    }
    
    const query = `
      SELECT 
        id, uuid, title, slug, type, status, price, currency,
        location_area, location_city, location_country,
        bedrooms, bathrooms, parking, size, size_unit,
        description, short_description, images, amenities,
        featured, views_count, created_at,
        ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
      FROM properties 
      WHERE search_vector @@ plainto_tsquery('english', $1)
        AND published = true 
        AND available = true
      ORDER BY rank DESC, featured DESC, created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [term, parseInt(limit), parseInt(offset)]);
    
    // Get total count for search results
    const countQuery = `
      SELECT COUNT(*) 
      FROM properties 
      WHERE search_vector @@ plainto_tsquery('english', $1)
        AND published = true 
        AND available = true
    `;
    
    const countResult = await pool.query(countQuery, [term]);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      results: result.rows,
      searchTerm: term,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasNext: parseInt(offset) + parseInt(limit) < totalCount,
        hasPrev: parseInt(offset) > 0
      }
    });
    
  } catch (err) {
    console.error('Error searching properties:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get featured properties
router.get('/featured/list', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const query = `
      SELECT 
        id, uuid, title, slug, type, status, price, currency,
        location_area, location_city, location_country,
        bedrooms, bathrooms, parking, size, size_unit,
        description, short_description, images, amenities,
        featured, views_count, created_at
      FROM properties 
      WHERE featured = true 
        AND published = true 
        AND available = true
      ORDER BY created_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [parseInt(limit)]);
    res.json(result.rows);
    
  } catch (err) {
    console.error('Error fetching featured properties:', err);
    res.status(500).json({ error: 'Failed to fetch featured properties' });
  }
});

// Get properties by type
router.get('/type/:propertyType', async (req, res) => {
  try {
    const { propertyType } = req.params;
    const { limit = 12, offset = 0 } = req.query;
    
    const allowedTypes = ['Villa', 'Apartment', 'Penthouse', 'Condo'];
    if (!allowedTypes.includes(propertyType)) {
      return res.status(400).json({ error: 'Invalid property type' });
    }
    
    const query = `
      SELECT 
        id, uuid, title, slug, type, status, price, currency,
        location_area, location_city, location_country,
        bedrooms, bathrooms, parking, size, size_unit,
        description, short_description, images, amenities,
        featured, views_count, created_at
      FROM properties 
      WHERE type = $1 
        AND published = true 
        AND available = true
      ORDER BY featured DESC, created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [propertyType, parseInt(limit), parseInt(offset)]);
    
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM properties WHERE type = $1 AND published = true AND available = true',
      [propertyType]
    );
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      properties: result.rows,
      type: propertyType,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasNext: parseInt(offset) + parseInt(limit) < totalCount,
        hasPrev: parseInt(offset) > 0
      }
    });
    
  } catch (err) {
    console.error('Error fetching properties by type:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get properties statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_properties,
        COUNT(CASE WHEN status = 'For Sale' THEN 1 END) as for_sale_count,
        COUNT(CASE WHEN status = 'For Rent' THEN 1 END) as for_rent_count,
        COUNT(CASE WHEN featured = true THEN 1 END) as featured_count,
        COUNT(CASE WHEN type = 'Villa' THEN 1 END) as villa_count,
        COUNT(CASE WHEN type = 'Apartment' THEN 1 END) as apartment_count,
        COUNT(CASE WHEN type = 'Penthouse' THEN 1 END) as penthouse_count,
        COUNT(CASE WHEN type = 'Condo' THEN 1 END) as condo_count,
        AVG(price)::bigint as average_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        SUM(views_count) as total_views,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month
      FROM properties 
      WHERE published = true AND available = true
    `;
    
    const result = await pool.query(query);
    res.json(result.rows[0]);
    
  } catch (err) {
    console.error('Error fetching property stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;