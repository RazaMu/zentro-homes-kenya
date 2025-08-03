const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware to verify admin token (reused from admin.js)
const verifyAdminToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Track analytics event (public endpoint)
router.post('/track', async (req, res) => {
  try {
    const {
      event_type,
      page_url,
      property_id,
      session_id,
      event_data = {},
      duration,
      country,
      city,
      device_type,
      browser,
      os
    } = req.body;

    if (!event_type) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    // Get client information
    const user_agent = req.get('User-Agent');
    const ip_address = req.ip || req.connection.remoteAddress;
    const referrer = req.get('Referer');

    const query = `
      INSERT INTO website_analytics (
        event_type, page_url, property_id, session_id, user_agent,
        ip_address, referrer, event_data, duration, country, city,
        device_type, browser, os
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, created_at
    `;

    const values = [
      event_type,
      page_url,
      property_id ? parseInt(property_id) : null,
      session_id,
      user_agent,
      ip_address,
      referrer,
      JSON.stringify(event_data),
      duration ? parseInt(duration) : null,
      country,
      city,
      device_type,
      browser,
      os
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Analytics event tracked',
      event: {
        id: result.rows[0].id,
        tracked_at: result.rows[0].created_at
      }
    });

  } catch (err) {
    console.error('Error tracking analytics event:', err);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get analytics overview (admin only)
router.get('/overview', verifyAdminToken, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const days = parseInt(period);

    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT ip_address) as unique_visitors,
        COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views,
        COUNT(CASE WHEN event_type = 'property_view' THEN 1 END) as property_views,
        COUNT(CASE WHEN event_type = 'contact_form' THEN 1 END) as contact_forms,
        COUNT(CASE WHEN event_type = 'search' THEN 1 END) as searches,
        AVG(duration) as avg_session_duration,
        COUNT(CASE WHEN device_type = 'mobile' THEN 1 END) as mobile_users,
        COUNT(CASE WHEN device_type = 'desktop' THEN 1 END) as desktop_users,
        COUNT(CASE WHEN device_type = 'tablet' THEN 1 END) as tablet_users
      FROM website_analytics
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `;

    const result = await pool.query(query);

    // Get top pages
    const topPagesQuery = `
      SELECT 
        page_url,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as unique_views
      FROM website_analytics
      WHERE event_type = 'page_view' 
        AND created_at >= NOW() - INTERVAL '${days} days'
        AND page_url IS NOT NULL
      GROUP BY page_url
      ORDER BY views DESC
      LIMIT 10
    `;

    const topPagesResult = await pool.query(topPagesQuery);

    // Get top properties
    const topPropertiesQuery = `
      SELECT 
        wa.property_id,
        p.title,
        p.type,
        p.location_area,
        p.location_city,
        COUNT(*) as views,
        COUNT(DISTINCT wa.session_id) as unique_views
      FROM website_analytics wa
      JOIN properties p ON wa.property_id = p.id
      WHERE wa.event_type = 'property_view' 
        AND wa.created_at >= NOW() - INTERVAL '${days} days'
        AND wa.property_id IS NOT NULL
      GROUP BY wa.property_id, p.title, p.type, p.location_area, p.location_city
      ORDER BY views DESC
      LIMIT 10
    `;

    const topPropertiesResult = await pool.query(topPropertiesQuery);

    // Get daily stats for the period
    const dailyStatsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views,
        COUNT(CASE WHEN event_type = 'property_view' THEN 1 END) as property_views
      FROM website_analytics
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const dailyStatsResult = await pool.query(dailyStatsQuery);

    res.json({
      overview: result.rows[0],
      top_pages: topPagesResult.rows,
      top_properties: topPropertiesResult.rows,
      daily_stats: dailyStatsResult.rows,
      period_days: days,
      generated_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error fetching analytics overview:', err);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// Get property analytics (admin only)
router.get('/properties/:property_id', verifyAdminToken, async (req, res) => {
  try {
    const { property_id } = req.params;
    const { period = '30' } = req.query;
    const days = parseInt(period);

    // Verify property exists
    const propertyCheck = await pool.query(
      'SELECT id, title, type FROM properties WHERE id = $1',
      [parseInt(property_id)]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = propertyCheck.rows[0];

    // Get property analytics
    const analyticsQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT ip_address) as unique_visitors,
        COUNT(CASE WHEN event_type = 'property_view' THEN 1 END) as property_views,
        COUNT(CASE WHEN event_type = 'contact_form' THEN 1 END) as contact_forms,
        COUNT(CASE WHEN event_type = 'phone_click' THEN 1 END) as phone_clicks,
        COUNT(CASE WHEN event_type = 'email_click' THEN 1 END) as email_clicks,
        AVG(duration) as avg_time_on_property,
        COUNT(CASE WHEN device_type = 'mobile' THEN 1 END) as mobile_views,
        COUNT(CASE WHEN device_type = 'desktop' THEN 1 END) as desktop_views
      FROM website_analytics
      WHERE property_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
    `;

    const analyticsResult = await pool.query(analyticsQuery, [parseInt(property_id)]);

    // Get daily views for the property
    const dailyViewsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(CASE WHEN event_type = 'property_view' THEN 1 END) as property_views
      FROM website_analytics
      WHERE property_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const dailyViewsResult = await pool.query(dailyViewsQuery, [parseInt(property_id)]);

    // Get referrer sources
    const referrersQuery = `
      SELECT 
        CASE 
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%facebook%' THEN 'Facebook'
          WHEN referrer LIKE '%instagram%' THEN 'Instagram'
          WHEN referrer LIKE '%twitter%' THEN 'Twitter'
          WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
          ELSE 'Other'
        END as source,
        COUNT(*) as visits
      FROM website_analytics
      WHERE property_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY source
      ORDER BY visits DESC
    `;

    const referrersResult = await pool.query(referrersQuery, [parseInt(property_id)]);

    res.json({
      property: property,
      analytics: analyticsResult.rows[0],
      daily_views: dailyViewsResult.rows,
      traffic_sources: referrersResult.rows,
      period_days: days,
      generated_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error fetching property analytics:', err);
    res.status(500).json({ error: 'Failed to fetch property analytics' });
  }
});

// Get traffic sources (admin only)
router.get('/traffic-sources', verifyAdminToken, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);

    const query = `
      SELECT 
        CASE 
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%facebook%' THEN 'Facebook'
          WHEN referrer LIKE '%instagram%' THEN 'Instagram'
          WHEN referrer LIKE '%twitter%' THEN 'Twitter'
          WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
          WHEN referrer LIKE '%bing%' THEN 'Bing'
          WHEN referrer LIKE '%yahoo%' THEN 'Yahoo'
          ELSE 'Other'
        END as source,
        COUNT(*) as visits,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT ip_address) as unique_visitors,
        AVG(duration) as avg_duration
      FROM website_analytics
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY source
      ORDER BY visits DESC
    `;

    const result = await pool.query(query);

    res.json({
      traffic_sources: result.rows,
      period_days: days,
      generated_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error fetching traffic sources:', err);
    res.status(500).json({ error: 'Failed to fetch traffic sources' });
  }
});

// Get device and browser stats (admin only)
router.get('/devices', verifyAdminToken, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);

    // Device types
    const deviceQuery = `
      SELECT 
        COALESCE(device_type, 'Unknown') as device_type,
        COUNT(*) as sessions,
        COUNT(DISTINCT ip_address) as unique_visitors
      FROM website_analytics
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY device_type
      ORDER BY sessions DESC
    `;

    // Browser stats
    const browserQuery = `
      SELECT 
        COALESCE(browser, 'Unknown') as browser,
        COUNT(*) as sessions,
        COUNT(DISTINCT ip_address) as unique_visitors
      FROM website_analytics
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY browser
      ORDER BY sessions DESC
      LIMIT 10
    `;

    // Operating system stats
    const osQuery = `
      SELECT 
        COALESCE(os, 'Unknown') as operating_system,
        COUNT(*) as sessions,
        COUNT(DISTINCT ip_address) as unique_visitors
      FROM website_analytics
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY os
      ORDER BY sessions DESC
      LIMIT 10
    `;

    const [deviceResult, browserResult, osResult] = await Promise.all([
      pool.query(deviceQuery),
      pool.query(browserQuery),
      pool.query(osQuery)
    ]);

    res.json({
      devices: deviceResult.rows,
      browsers: browserResult.rows,
      operating_systems: osResult.rows,
      period_days: days,
      generated_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error fetching device stats:', err);
    res.status(500).json({ error: 'Failed to fetch device statistics' });
  }
});

// Get search analytics (admin only)
router.get('/searches', verifyAdminToken, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);

    const query = `
      SELECT 
        event_data->>'search_term' as search_term,
        event_data->>'results_count' as results_count,
        COUNT(*) as search_count,
        COUNT(DISTINCT session_id) as unique_searches
      FROM website_analytics
      WHERE event_type = 'search' 
        AND created_at >= NOW() - INTERVAL '${days} days'
        AND event_data->>'search_term' IS NOT NULL
      GROUP BY event_data->>'search_term', event_data->>'results_count'
      ORDER BY search_count DESC
      LIMIT 20
    `;

    const result = await pool.query(query);

    // Get searches with no results
    const noResultsQuery = `
      SELECT 
        event_data->>'search_term' as search_term,
        COUNT(*) as search_count
      FROM website_analytics
      WHERE event_type = 'search' 
        AND created_at >= NOW() - INTERVAL '${days} days'
        AND (event_data->>'results_count')::int = 0
      GROUP BY event_data->>'search_term'
      ORDER BY search_count DESC
      LIMIT 10
    `;

    const noResultsResult = await pool.query(noResultsQuery);

    res.json({
      popular_searches: result.rows,
      no_results_searches: noResultsResult.rows,
      period_days: days,
      generated_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error fetching search analytics:', err);
    res.status(500).json({ error: 'Failed to fetch search analytics' });
  }
});

// Clean up old analytics data (admin only)
router.delete('/cleanup', verifyAdminToken, async (req, res) => {
  try {
    const { days = 365 } = req.query; // Default to keep 1 year of data

    const query = `
      DELETE FROM website_analytics 
      WHERE created_at < NOW() - INTERVAL '${parseInt(days)} days'
    `;

    const result = await pool.query(query);

    res.json({
      message: 'Analytics data cleaned up successfully',
      deleted_records: result.rowCount,
      kept_days: parseInt(days)
    });

  } catch (err) {
    console.error('Error cleaning up analytics data:', err);
    res.status(500).json({ error: 'Failed to cleanup analytics data' });
  }
});

module.exports = router;