const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Submit contact inquiry
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      property_id,
      inquiry_type = 'general',
      subject,
      message,
      preferred_contact_method = 'email',
      preferred_contact_time,
      source = 'website'
    } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Name, email, and message are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Get client IP and user agent
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');
    const referrer = req.get('Referer');

    // Verify property exists if property_id is provided
    if (property_id) {
      const propertyCheck = await pool.query(
        'SELECT id FROM properties WHERE id = $1 AND published = true',
        [property_id]
      );
      
      if (propertyCheck.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Property not found' 
        });
      }
    }

    const query = `
      INSERT INTO contact_inquiries (
        name, email, phone, property_id, inquiry_type, subject, message,
        preferred_contact_method, preferred_contact_time, source,
        user_agent, ip_address, referrer, status, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, uuid, created_at
    `;

    const values = [
      name.trim(),
      email.toLowerCase().trim(),
      phone ? phone.trim() : null,
      property_id ? parseInt(property_id) : null,
      inquiry_type,
      subject ? subject.trim() : null,
      message.trim(),
      preferred_contact_method,
      preferred_contact_time,
      source,
      user_agent,
      ip_address,
      referrer,
      'new',
      'normal'
    ];

    const result = await pool.query(query, values);
    
    res.status(201).json({
      message: 'Contact inquiry submitted successfully',
      inquiry: {
        id: result.rows[0].id,
        uuid: result.rows[0].uuid,
        submitted_at: result.rows[0].created_at
      }
    });

  } catch (err) {
    console.error('Error submitting contact inquiry:', err);
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

// Get all contact inquiries (admin only - will be protected by admin auth)
router.get('/', async (req, res) => {
  try {
    const {
      status,
      priority,
      inquiry_type,
      property_id,
      assigned_to,
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        ci.id, ci.uuid, ci.name, ci.email, ci.phone,
        ci.property_id, ci.inquiry_type, ci.subject, ci.message,
        ci.preferred_contact_method, ci.preferred_contact_time,
        ci.status, ci.priority, ci.assigned_to, ci.admin_notes,
        ci.source, ci.user_agent, ci.ip_address, ci.referrer,
        ci.created_at, ci.updated_at, ci.contacted_at,
        p.title as property_title, p.type as property_type,
        p.location_area, p.location_city
      FROM contact_inquiries ci
      LEFT JOIN properties p ON ci.property_id = p.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    // Apply filters
    if (status) {
      paramCount++;
      query += ` AND ci.status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount++;
      query += ` AND ci.priority = $${paramCount}`;
      params.push(priority);
    }

    if (inquiry_type) {
      paramCount++;
      query += ` AND ci.inquiry_type = $${paramCount}`;
      params.push(inquiry_type);
    }

    if (property_id) {
      paramCount++;
      query += ` AND ci.property_id = $${paramCount}`;
      params.push(parseInt(property_id));
    }

    if (assigned_to) {
      paramCount++;
      query += ` AND ci.assigned_to = $${paramCount}`;
      params.push(assigned_to);
    }

    // Add sorting
    const allowedSortFields = ['created_at', 'updated_at', 'status', 'priority', 'name', 'email'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ci.${sortField} ${sortDirection}`;

    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM contact_inquiries ci WHERE 1=1`;
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND ci.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (priority) {
      countParamCount++;
      countQuery += ` AND ci.priority = $${countParamCount}`;
      countParams.push(priority);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      inquiries: result.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasNext: parseInt(offset) + parseInt(limit) < totalCount,
        hasPrev: parseInt(offset) > 0
      }
    });

  } catch (err) {
    console.error('Error fetching contact inquiries:', err);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

// Get contact inquiry by ID (admin only)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        ci.id, ci.uuid, ci.name, ci.email, ci.phone,
        ci.property_id, ci.inquiry_type, ci.subject, ci.message,
        ci.preferred_contact_method, ci.preferred_contact_time,
        ci.status, ci.priority, ci.assigned_to, ci.admin_notes,
        ci.source, ci.user_agent, ci.ip_address, ci.referrer,
        ci.created_at, ci.updated_at, ci.contacted_at,
        p.title as property_title, p.type as property_type,
        p.location_area, p.location_city, p.price, p.images
      FROM contact_inquiries ci
      LEFT JOIN properties p ON ci.property_id = p.id
      WHERE ci.id = $1 OR ci.uuid = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact inquiry not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Error fetching contact inquiry:', err);
    res.status(500).json({ error: 'Failed to fetch inquiry' });
  }
});

// Update contact inquiry status (admin only)
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assigned_to, admin_notes } = req.body;

    // Validation
    const allowedStatuses = ['new', 'in_progress', 'contacted', 'resolved', 'closed'];
    const allowedPriorities = ['low', 'normal', 'high', 'urgent'];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    let query = 'UPDATE contact_inquiries SET updated_at = NOW()';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += `, status = $${paramCount}`;
      params.push(status);
      
      // Set contacted_at when status changes to contacted
      if (status === 'contacted') {
        query += `, contacted_at = NOW()`;
      }
    }

    if (priority) {
      paramCount++;
      query += `, priority = $${paramCount}`;
      params.push(priority);
    }

    if (assigned_to !== undefined) {
      paramCount++;
      query += `, assigned_to = $${paramCount}`;
      params.push(assigned_to);
    }

    if (admin_notes !== undefined) {
      paramCount++;
      query += `, admin_notes = $${paramCount}`;
      params.push(admin_notes);
    }

    paramCount++;
    query += ` WHERE (id = $${paramCount} OR uuid = $${paramCount}) RETURNING id, status, priority, assigned_to, updated_at`;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact inquiry not found' });
    }

    res.json({
      message: 'Contact inquiry updated successfully',
      inquiry: result.rows[0]
    });

  } catch (err) {
    console.error('Error updating contact inquiry:', err);
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

// Get contact inquiries statistics (admin only)
router.get('/stats/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_inquiries,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_count,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_count,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as week_count,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as month_count,
        COUNT(CASE WHEN property_id IS NOT NULL THEN 1 END) as property_specific_count,
        COUNT(CASE WHEN inquiry_type = 'viewing' THEN 1 END) as viewing_requests
      FROM contact_inquiries
    `;

    const result = await pool.query(query);
    
    // Get response time stats
    const responseQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (contacted_at - created_at))/3600)::numeric(10,2) as avg_response_hours,
        MIN(EXTRACT(EPOCH FROM (contacted_at - created_at))/3600)::numeric(10,2) as min_response_hours,
        MAX(EXTRACT(EPOCH FROM (contacted_at - created_at))/3600)::numeric(10,2) as max_response_hours
      FROM contact_inquiries 
      WHERE contacted_at IS NOT NULL
    `;

    const responseResult = await pool.query(responseQuery);

    res.json({
      ...result.rows[0],
      response_time: responseResult.rows[0]
    });

  } catch (err) {
    console.error('Error fetching contact statistics:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get inquiries by property (for property detail pages)
router.get('/property/:property_id/count', async (req, res) => {
  try {
    const { property_id } = req.params;

    const query = `
      SELECT 
        COUNT(*) as total_inquiries,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_inquiries
      FROM contact_inquiries 
      WHERE property_id = $1
    `;

    const result = await pool.query(query, [parseInt(property_id)]);
    res.json(result.rows[0]);

  } catch (err) {
    console.error('Error fetching property inquiry count:', err);
    res.status(500).json({ error: 'Failed to fetch inquiry count' });
  }
});

// Delete contact inquiry (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM contact_inquiries WHERE id = $1 OR uuid = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact inquiry not found' });
    }

    res.json({ message: 'Contact inquiry deleted successfully' });

  } catch (err) {
    console.error('Error deleting contact inquiry:', err);
    res.status(500).json({ error: 'Failed to delete inquiry' });
  }
});

module.exports = router;