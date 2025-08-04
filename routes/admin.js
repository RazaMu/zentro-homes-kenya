const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Hardcoded admin credentials as per user requirement
const ADMIN_CREDENTIALS = {
  email: 'admin',
  password: 'zentro2025', // In production, this should be hashed
  name: 'Admin User',
  role: 'admin'
};

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Admin login (using hardcoded credentials)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check against hardcoded credentials
    if (email.toLowerCase() !== ADMIN_CREDENTIALS.email.toLowerCase() || password !== ADMIN_CREDENTIALS.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        email: ADMIN_CREDENTIALS.email,
        name: ADMIN_CREDENTIALS.name,
        role: ADMIN_CREDENTIALS.role,
        loginTime: new Date().toISOString()
      },
      process.env.JWT_SECRET || 'default-secret-key',
      { expiresIn: '24h' }
    );

    // Store session in database (optional)
    try {
      const sessionQuery = `
        INSERT INTO admin_sessions (admin_user_id, session_token, ip_address, user_agent, expires_at)
        VALUES (1, $1, $2, $3, $4)
        ON CONFLICT (session_token) DO UPDATE SET
          last_activity = NOW(),
          ip_address = $2,
          user_agent = $3
      `;
      
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      await pool.query(sessionQuery, [token, ipAddress, userAgent, expiresAt]);
    } catch (sessionError) {
      console.log('Session storage failed (non-critical):', sessionError.message);
    }

    res.json({
      message: 'Login successful',
      token,
      admin: {
        email: ADMIN_CREDENTIALS.email,
        name: ADMIN_CREDENTIALS.name,
        role: ADMIN_CREDENTIALS.role
      }
    });

  } catch (err) {
    console.error('Error during admin login:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin logout
router.post('/logout', verifyAdminToken, async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Deactivate session in database
    try {
      await pool.query(
        'UPDATE admin_sessions SET active = false WHERE session_token = $1',
        [token]
      );
    } catch (sessionError) {
      console.log('Session cleanup failed (non-critical):', sessionError.message);
    }

    res.json({ message: 'Logout successful' });

  } catch (err) {
    console.error('Error during admin logout:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Verify admin token
router.get('/verify', verifyAdminToken, (req, res) => {
  res.json({
    valid: true,
    admin: {
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role,
      loginTime: req.admin.loginTime
    }
  });
});

// Get admin dashboard statistics
router.get('/dashboard/stats', verifyAdminToken, async (req, res) => {
  try {
    // Properties stats
    const propertiesQuery = `
      SELECT 
        COUNT(*) as total_properties,
        COUNT(CASE WHEN status = 'For Sale' THEN 1 END) as for_sale_count,
        COUNT(CASE WHEN status = 'For Rent' THEN 1 END) as for_rent_count,
        COUNT(CASE WHEN featured = true THEN 1 END) as featured_count,
        COUNT(CASE WHEN published = false THEN 1 END) as unpublished_count,
        COUNT(CASE WHEN available = false THEN 1 END) as unavailable_count,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month,
        AVG(price)::bigint as average_price,
        SUM(views_count) as total_views
      FROM properties
    `;

    // Contacts stats
    const contactsQuery = `
      SELECT 
        COUNT(*) as total_inquiries,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_inquiries,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_inquiries,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_inquiries,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_inquiries,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_inquiries,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as week_inquiries
      FROM contact_inquiries
    `;

    // Recent activity
    const recentPropertiesQuery = `
      SELECT id, title, type, status, created_at
      FROM properties 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    const recentInquiriesQuery = `
      SELECT 
        ci.id, ci.name, ci.email, ci.inquiry_type, ci.status, ci.created_at,
        p.title as property_title
      FROM contact_inquiries ci
      LEFT JOIN properties p ON ci.property_id = p.id
      ORDER BY ci.created_at DESC 
      LIMIT 5
    `;

    // Execute all queries in parallel
    const [propertiesResult, contactsResult, recentPropertiesResult, recentInquiriesResult] = await Promise.all([
      pool.query(propertiesQuery),
      pool.query(contactsQuery),
      pool.query(recentPropertiesQuery),
      pool.query(recentInquiriesQuery)
    ]);

    res.json({
      properties: propertiesResult.rows[0],
      contacts: contactsResult.rows[0],
      recent: {
        properties: recentPropertiesResult.rows,
        inquiries: recentInquiriesResult.rows
      },
      generated_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Admin CRUD operations for properties
router.get('/properties', verifyAdminToken, async (req, res) => {
  try {
    const {
      published,
      available,
      featured,
      type,
      status,
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        id, uuid, title, slug, type, status, price, currency,
        location_area, location_city, bedrooms, bathrooms, parking,
        size, size_unit, featured, published, available, views_count,
        created_at, updated_at
      FROM properties
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (published !== undefined) {
      paramCount++;
      query += ` AND published = $${paramCount}`;
      params.push(published === 'true');
    }

    if (available !== undefined) {
      paramCount++;
      query += ` AND available = $${paramCount}`;
      params.push(available === 'true');
    }

    if (featured !== undefined) {
      paramCount++;
      query += ` AND featured = $${paramCount}`;
      params.push(featured === 'true');
    }

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

    // Add sorting
    const allowedSortFields = ['created_at', 'updated_at', 'title', 'price', 'views_count'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortDirection}`;

    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM properties');
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
    console.error('Error fetching admin properties:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Create new property
router.post('/properties', verifyAdminToken, async (req, res) => {
  try {
    const {
      title, type, status, price, currency = 'KES',
      location_area, location_city, location_country = 'Kenya',
      coordinates_lat, coordinates_lng,
      bedrooms, bathrooms, parking = 0, size, size_unit = 'm²',
      year_built, furnished = true, description, short_description,
      images = [], videos = [], virtual_tour_url, amenities = [], features = {},
      meta_title, meta_description, meta_keywords = [],
      available = true, featured = false, published = true, youtube_url
    } = req.body;

    // Validation
    if (!title || !type || !status || !price || !location_area || !location_city || 
        !bedrooms || !bathrooms || !size || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, type, status, price, location_area, location_city, bedrooms, bathrooms, size, description' 
      });
    }

    const allowedTypes = ['Villa', 'Apartment', 'Penthouse', 'Condo'];
    const allowedStatuses = ['For Sale', 'For Rent'];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid property type' });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid property status' });
    }

    const query = `
      INSERT INTO properties (
        title, type, status, price, currency,
        location_area, location_city, location_country,
        coordinates_lat, coordinates_lng,
        bedrooms, bathrooms, parking, size, size_unit,
        year_built, furnished, description, short_description,
        images, videos, virtual_tour_url, amenities, features,
        meta_title, meta_description, meta_keywords,
        available, featured, published, youtube_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
      ) RETURNING id, uuid, slug, created_at
    `;

    const values = [
      title, type, status, parseInt(price), currency,
      location_area, location_city, location_country,
      coordinates_lat ? parseFloat(coordinates_lat) : null,
      coordinates_lng ? parseFloat(coordinates_lng) : null,
      parseInt(bedrooms), parseInt(bathrooms), parseInt(parking),
      parseInt(size), size_unit, year_built ? parseInt(year_built) : null,
      furnished, description, short_description,
      JSON.stringify(images), JSON.stringify(videos), virtual_tour_url,
      JSON.stringify(amenities), JSON.stringify(features),
      meta_title, meta_description, meta_keywords,
      available, featured, published, youtube_url
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Property created successfully',
      property: result.rows[0]
    });

  } catch (err) {
    console.error('Error creating property:', err);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Update property
router.put('/properties/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove id and timestamps from update data
    delete updateData.id;
    delete updateData.uuid;
    delete updateData.created_at;
    delete updateData.updated_at;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    // Build dynamic update query
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    
    let query = 'UPDATE properties SET ';
    const setClause = fields.map((field, index) => {
      // Handle JSON fields
      if (['images', 'videos', 'amenities', 'features', 'meta_keywords'].includes(field)) {
        return `${field} = $${index + 1}::jsonb`;
      }
      return `${field} = $${index + 1}`;
    }).join(', ');
    
    query += setClause;
    query += `, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING id, title, updated_at`;
    
    // Convert arrays/objects to JSON strings for JSON fields
    const processedValues = values.map((value, index) => {
      const field = fields[index];
      if (['images', 'videos', 'amenities', 'features', 'meta_keywords'].includes(field) && 
          typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    });
    
    processedValues.push(parseInt(id));

    const result = await pool.query(query, processedValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({
      message: 'Property updated successfully',
      property: result.rows[0]
    });

  } catch (err) {
    console.error('Error updating property:', err);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// Delete property
router.delete('/properties/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM properties WHERE id = $1 RETURNING id, title',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({
      message: 'Property deleted successfully',
      property: result.rows[0]
    });

  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// Get all admin sessions
router.get('/sessions', verifyAdminToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        id, session_token, ip_address, user_agent, active,
        expires_at, last_activity, created_at
      FROM admin_sessions
      WHERE expires_at > NOW()
      ORDER BY last_activity DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {
    console.error('Error fetching admin sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

module.exports = router;