const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Railway Volume configuration for file uploads
const uploadPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '..', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  // console.log(`📁 Created upload directory: ${uploadPath}`);
}

// Multer configuration for Railway volume storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: function (req, file, cb) {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Hardcoded admin credentials as per user requirement
const ADMIN_CREDENTIALS = {
  username: 'admin',
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Debug logging
    // console.log('Login attempt:', { 
    //   received_username: username, 
    //   received_password: password,
    //   expected_username: ADMIN_CREDENTIALS.username,
    //   expected_password: ADMIN_CREDENTIALS.password 
    // });

    // Check against hardcoded credentials
    if (username.toLowerCase() !== ADMIN_CREDENTIALS.username.toLowerCase() || password !== ADMIN_CREDENTIALS.password) {
      // console.log('Login failed - credential mismatch');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        username: ADMIN_CREDENTIALS.username,
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
      // console.log('Session storage failed (non-critical):', sessionError.message);
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
    // console.error('Error during admin login:', err);
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
      // console.log('Session cleanup failed (non-critical):', sessionError.message);
    }

    res.json({ message: 'Logout successful' });

  } catch (err) {
    // console.error('Error during admin logout:', err);
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
    // console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// UPLOAD ROUTES (must be before parameterized routes)
// Single file upload endpoint (used by admin panel)
router.post('/upload', verifyAdminToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // console.log(`📸 Uploaded single file to Railway volume: ${req.file.filename}`);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      url: `/uploads/${req.file.filename}`, // Public URL path
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

  } catch (error) {
    // console.error('Single file upload error:', error);
    res.status(500).json({ 
      error: 'File upload failed',
      message: error.message 
    });
  }
});

// Multiple file upload endpoint for property images
router.post('/upload/images', verifyAdminToken, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // console.log(`📸 Uploaded ${req.files.length} images to Railway volume`);

    // Process uploaded files
    const uploadedImages = req.files.map((file, index) => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
      url: `/uploads/${file.filename}`, // Public URL path
      isPrimary: index === 0, // First image is primary
      displayOrder: index
    }));

    res.json({
      success: true,
      message: `Successfully uploaded ${req.files.length} images`,
      images: uploadedImages
    });

  } catch (error) {
    // console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'File upload failed',
      message: error.message 
    });
  }
});

// Local file upload endpoint with Img_X naming and property ID folder organization
router.post('/upload-local', verifyAdminToken, (req, res) => {
  // Custom multer instance for local storage with property-specific folders
  const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      const propertyId = req.body.propertyId;
      if (!propertyId) {
        return cb(new Error('Property ID is required for local upload'), null);
      }
      
      // Create property-specific folder in uploads directory
      const propertyUploadPath = path.join(uploadPath, propertyId.toString());
      
      // Ensure property directory exists
      if (!fs.existsSync(propertyUploadPath)) {
        fs.mkdirSync(propertyUploadPath, { recursive: true });
        // console.log(`📁 Created property directory: ${propertyUploadPath}`);
      }
      
      cb(null, propertyUploadPath);
    },
    filename: function (req, file, cb) {
      // Use custom filename from request body (Img_X format)
      const customFileName = req.body.fileName;
      if (!customFileName) {
        return cb(new Error('Custom filename is required'), null);
      }
      cb(null, customFileName);
    }
  });

  const localUpload = multer({
    storage: localStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: function (req, file, cb) {
      // Only allow image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
    }
  }).single('file');

  localUpload(req, res, function (err) {
    if (err) {
      // console.error('Local upload error:', err);
      return res.status(400).json({ 
        error: 'File upload failed',
        message: err.message 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const propertyId = req.body.propertyId;
    const relativePath = `/uploads/${propertyId}/${req.file.filename}`;
    
    // console.log(`📸 Uploaded file locally: ${req.file.filename} for property ${propertyId}`);

    res.json({
      success: true,
      message: 'File uploaded successfully to local storage',
      url: relativePath, // Relative path for database storage
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      propertyId: propertyId,
      fullPath: req.file.path
    });
  });
});

// Delete property images (used when updating property images)
router.delete('/properties/:id/images', verifyAdminToken, async (req, res) => {
  try {
    const propertyId = req.params.id;
    const propertyUploadPath = path.join(uploadPath, propertyId.toString());
    
    // Check if property folder exists
    if (fs.existsSync(propertyUploadPath)) {
      // Get all files in the property folder
      const files = fs.readdirSync(propertyUploadPath);
      
      // Delete all image files
      files.forEach(file => {
        const filePath = path.join(propertyUploadPath, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          // console.log(`🗑️ Deleted image file: ${filePath}`);
        }
      });
      
      // Remove the empty directory
      fs.rmdirSync(propertyUploadPath);
      // console.log(`🗑️ Deleted property directory: ${propertyUploadPath}`);
    }
    
    res.json({
      success: true,
      message: `Successfully deleted all images for property ${propertyId}`
    });
    
  } catch (error) {
    // console.error('Error deleting property images:', error);
    res.status(500).json({ 
      error: 'Failed to delete property images',
      message: error.message 
    });
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
      search,
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
        images, videos, description, amenities, virtual_tour_url,
        coordinates_lat, coordinates_lng,
        (images->0->>'url') as main_image,
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

    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR location_area ILIKE $${paramCount} OR location_city ILIKE $${paramCount})`;
      params.push(`%${search}%`);
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
    // console.error('Error fetching admin properties:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Create new property
router.post('/properties', verifyAdminToken, async (req, res) => {
  try {
    const {
      title, type, status, price, currency = 'KES',
      location_area, location_city, location_country = 'Kenya',
      coordinates, coordinates_lat, coordinates_lng,
      bedrooms, bathrooms, parking = 0, size, size_unit = 'm²',
      year_built, furnished = true, description, short_description,
      main_image, gallery_images, // New flat structure
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

    // Handle coordinates - support both string format ("lat,lng") and separate lat/lng
    let coordsLat = null, coordsLng = null;
    if (coordinates && typeof coordinates === 'string' && coordinates.includes(',')) {
      const [lat, lng] = coordinates.split(',').map(c => c.trim());
      coordsLat = lat ? parseFloat(lat) : null;
      coordsLng = lng ? parseFloat(lng) : null;
    } else if (coordinates_lat && coordinates_lng) {
      coordsLat = parseFloat(coordinates_lat);
      coordsLng = parseFloat(coordinates_lng);
    }

    // Handle amenities - support both array and comma-separated string
    let amenitiesProcessed = [];
    if (typeof amenities === 'string') {
      amenitiesProcessed = amenities.split(',').map(a => a.trim()).filter(a => a);
    } else if (Array.isArray(amenities)) {
      amenitiesProcessed = amenities;
    }

    const query = `
      INSERT INTO properties (
        title, type, status, price, currency,
        location_area, location_city, location_country,
        coordinates_lat, coordinates_lng,
        bedrooms, bathrooms, parking, size, size_unit,
        year_built, furnished, description, short_description,
        images, videos, virtual_tour_url, 
        amenities, features, meta_title, meta_description, meta_keywords,
        available, featured, published
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      ) RETURNING id, uuid, slug, created_at
    `;

    const values = [
      title, type, status, parseInt(price), currency,
      location_area, location_city, location_country,
      coordsLat, coordsLng,
      parseInt(bedrooms), parseInt(bathrooms), parseInt(parking),
      parseInt(size), size_unit, year_built ? parseInt(year_built) : null,
      furnished, description, short_description,
      JSON.stringify(images), JSON.stringify(videos), virtual_tour_url,
      JSON.stringify(amenitiesProcessed), JSON.stringify(features),
      meta_title, meta_description, meta_keywords,
      available, featured, published
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Property created successfully',
      property: result.rows[0]
    });

  } catch (err) {
    // console.error('Error creating property:', err);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Get single property by ID
router.get('/properties/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id, uuid, title, slug, type, status, price, currency,
        location_area, location_city, location_country,
        coordinates_lat, coordinates_lng, bedrooms, bathrooms, parking,
        size, size_unit, year_built, furnished, description, short_description,
        images, videos, virtual_tour_url,
        amenities, features, meta_title, meta_description, meta_keywords,
        available, featured, published, views_count,
        (images->0->>'url') as main_image,
        created_at, updated_at
      FROM properties 
      WHERE id = $1
    `;

    const result = await pool.query(query, [parseInt(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({
      property: result.rows[0]
    });

  } catch (err) {
    // console.error('Error fetching property:', err);
    res.status(500).json({ error: 'Failed to fetch property' });
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

    // Remove fields that don't exist in database schema
    delete updateData.coordinates;
    delete updateData.main_image;
    delete updateData.gallery_images;
    delete updateData.youtube_url;

    // Build dynamic update query
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    
    let query = 'UPDATE properties SET ';
    const setClause = fields.map((field, index) => {
      // Handle JSONB fields as per actual schema
      if (['images', 'videos', 'amenities', 'features', 'meta_keywords'].includes(field)) {
        return `${field} = $${index + 1}::jsonb`;
      }
      return `${field} = $${index + 1}`;
    }).join(', ');
    
    query += setClause;
    query += `, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING id, title, updated_at`;
    
    // Convert arrays/objects to JSON strings for JSONB fields
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
    // console.error('Error updating property:', err);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// Delete property
router.delete('/properties/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    // console.log('🗑️ BACKEND DEBUG: Delete request received for property ID:', id);
    // console.log('🗑️ BACKEND DEBUG: Request method:', req.method);
    // console.log('🗑️ BACKEND DEBUG: Request URL:', req.url);

    // Clean up associated images first
    const propertyUploadPath = path.join(uploadPath, id.toString());
    
    try {
      if (fs.existsSync(propertyUploadPath)) {
        // Get all files in the property folder
        const files = fs.readdirSync(propertyUploadPath);
        
        // Delete all image files
        files.forEach(file => {
          const filePath = path.join(propertyUploadPath, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            // console.log(`🗑️ Deleted image file: ${filePath}`);
          }
        });
        
        // Remove the empty directory
        fs.rmdirSync(propertyUploadPath);
        // console.log(`🗑️ Deleted property directory: ${propertyUploadPath}`);
      }
    } catch (imageCleanupError) {
      // console.warn('⚠️ Warning: Failed to clean up images (continuing with property deletion):', imageCleanupError.message);
    }

    const result = await pool.query(
      'DELETE FROM properties WHERE id = $1 RETURNING id, title',
      [parseInt(id)]
    );

    // console.log('🗑️ BACKEND DEBUG: Database delete result:', result.rows);

    if (result.rows.length === 0) {
      // console.log('❌ BACKEND DEBUG: Property not found in database');
      return res.status(404).json({ error: 'Property not found' });
    }

    const response = {
      message: 'Property and associated images deleted successfully',
      property: result.rows[0]
    };

    // console.log('✅ BACKEND DEBUG: Sending success response:', response);
    res.json(response);

  } catch (err) {
    // console.error('💥 BACKEND DEBUG: Error deleting property:', err);
    // console.error('💥 BACKEND DEBUG: Error stack:', err.stack);
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
    // console.error('Error fetching admin sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get contact inquiries (stub endpoint to prevent 404 errors)
router.get('/contacts', verifyAdminToken, async (req, res) => {
  try {
    // For now return empty array - can be implemented later if needed
    res.json({
      inquiries: [],
      total: 0,
      message: 'Contact inquiries endpoint - to be implemented'
    });
  } catch (err) {
    // console.error('Error fetching contact inquiries:', err);
    res.status(500).json({ error: 'Failed to fetch contact inquiries' });
  }
});

module.exports = router;