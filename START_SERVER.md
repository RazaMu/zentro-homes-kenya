# 🚀 Start Railway Server - Quick Guide

## Prerequisites
1. **Node.js**: Make sure Node.js 18+ is installed
2. **Environment**: `.env` file is already configured with your Railway database

## Steps to Start the Server

### 1. Install Dependencies (if not done already)
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Check Server Health
Open your browser and go to:
- **Health Check**: http://localhost:3000/health
- **Website**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

## Expected Output
When the server starts successfully, you should see:
```
🚀 Zentro Homes server running on port 3000
📊 Environment: development
🔗 Database: Connected
✅ Connected to Railway PostgreSQL database
```

## API Endpoints Available
- `GET /health` - Server health check
- `GET /api/properties` - Get all properties
- `GET /api/properties/:id` - Get specific property
- `POST /api/contacts` - Submit contact inquiry
- `POST /api/admin/login` - Admin login

## Troubleshooting

### If you get database connection errors:
1. Check your Railway database is still active
2. Verify the DATABASE_URL in `.env` file
3. Make sure the database allows external connections

### If you get port 3000 already in use:
1. Change PORT in `.env` to another port (like 3001)
2. Or stop the process using port 3000

### If npm install fails:
1. Try: `npm install --legacy-peer-deps`
2. Or: `npm cache clean --force` then `npm install`

## Admin Credentials
- **Email**: admin@zentrohomes.com
- **Password**: admin123

## What Should Happen Next
1. The website should load with Railway API integration
2. Properties should load from your Railway database
3. Admin panel should work with authentication
4. Contact forms should save to the database

**Note**: The first load might be slower as it connects to Railway's database.