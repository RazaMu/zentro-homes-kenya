# Local Image Storage Implementation

## Overview
Successfully implemented local image storage system with Img_X naming convention and property ID folder organization as requested. Images are now stored locally instead of Railway storage volume.

## Changes Made

### 1. Backend Changes (routes/admin.js)

#### New Upload Endpoint
- **Added**: `/api/admin/upload-local` endpoint
- **Features**:
  - Creates property-specific folders in `uploads/{propertyId}/`
  - Renames files to `Img_1.jpg`, `Img_2.jpg`, `Img_3.jpg`, `Img_4.jpg` format
  - Maintains file extensions from original uploads
  - Validates image file types only

#### Image Cleanup Endpoints
- **Added**: `/api/admin/properties/:id/images` DELETE endpoint
- **Updated**: Property deletion endpoint to clean up associated images
- **Features**:
  - Removes all images when property is deleted
  - Cleans up old images when property images are updated
  - Removes empty property directories

### 2. Frontend Changes (admin/js/admin.js)

#### Upload Logic Updates
- **Modified**: `saveToRailwayStorage()` → `saveToLocalStorage()`
- **Updated**: `processMediaUploads()` to handle property ID folders
- **Added**: `cleanupPropertyImages()` for image management

#### Image Processing
- Generates Img_X naming automatically
- Creates property-specific folders
- Handles both new properties and updates
- Preserves existing images when no new images uploaded

### 3. Data Manager Updates (js/railway-data-manager.js)

#### Image URL Processing
- **Updated**: `getImageUrl()` method to handle local paths
- **Enhanced**: Support for `/uploads/{propertyId}/Img_X.ext` format
- **Improved**: Image URL resolution for display

## File Structure

```
uploads/
├── {propertyId1}/
│   ├── Img_1.jpg
│   ├── Img_2.png
│   ├── Img_3.webp
│   └── Img_4.jpg
├── {propertyId2}/
│   ├── Img_1.jpg
│   └── Img_2.png
└── ...
```

## API Endpoints

### Upload Images
```
POST /api/admin/upload-local
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- file: [image file]
- propertyId: {property_id}
- fileName: Img_X.ext
```

### Delete Property Images
```
DELETE /api/admin/properties/{id}/images
Authorization: Bearer {token}
```

## CRUD Operations

### Create Property
1. User uploads images
2. Temporary property ID generated
3. Images saved to `uploads/{tempId}/` as Img_1, Img_2, etc.
4. Property created in database
5. Images paths stored in database

### Update Property
1. If new images uploaded:
   - Old images deleted from `uploads/{propertyId}/`
   - New images saved with Img_X naming
2. If no new images:
   - Existing images preserved

### Delete Property
1. Database record deleted
2. Associated image folder `uploads/{propertyId}/` removed
3. All Img_X files cleaned up

## Database Storage

Images are stored in the database as JSON arrays with local paths:
```json
{
  "images": [
    {
      "url": "/uploads/123/Img_1.jpg",
      "alt": "Property Name - Main Image",
      "isPrimary": true,
      "displayOrder": 0
    },
    {
      "url": "/uploads/123/Img_2.jpg",
      "alt": "Property Name - Gallery Image 2",
      "isPrimary": false,
      "displayOrder": 1
    }
  ]
}
```

## Static File Serving

Express server configured to serve uploaded files:
```javascript
app.use('/uploads', express.static(uploadPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '1h',
  etag: true,
  lastModified: true
}));
```

## Testing

Created `test-local-upload.js` to verify:
- ✅ Upload directory exists
- ✅ Property folder creation
- ✅ Img_X naming convention
- ✅ File cleanup functionality

## Migration Notes

### From Railway Storage to Local Storage
- All new images will use local storage
- Existing properties with Railway images will continue to work
- No manual migration required - updates automatically on property edit

### File Permissions
- Server has read/write access to uploads directory
- Proper error handling for file system operations
- Graceful fallback to base64 if upload fails

## Benefits

1. **Organized Storage**: Images grouped by property ID
2. **Consistent Naming**: Img_1, Img_2, Img_3, Img_4 format
3. **Easy Management**: Simple file operations for CRUD
4. **Performance**: Direct file serving without database queries
5. **Scalable**: Property-based folder structure

## Configuration

### Environment Variables
- `RAILWAY_VOLUME_MOUNT_PATH`: Upload directory path (defaults to ./uploads)
- Static serving automatically configured

### File Limits
- Maximum file size: 10MB per image
- File types: JPEG, PNG, WebP, GIF
- Maximum images per property: Unlimited (but UI shows 4 slots)

## Security

- Authentication required for all upload operations
- File type validation (images only)
- Property ID validation
- Path traversal protection
- File size limits enforced

## Error Handling

- Graceful fallback to base64 if upload fails
- Non-critical image cleanup errors don't block property operations
- Detailed logging for troubleshooting
- User-friendly error messages

## Implementation Complete

All requested features have been implemented:
- ✅ Images stored in `C:\Users\abdir\OneDrive\Desktop\zuberzz\uploads`
- ✅ Organized by property ID folders
- ✅ Renamed to Img_1, Img_2, Img_3, Img_4 format
- ✅ CRUD operations handle local files
- ✅ Database stores apartment info, files stored locally
- ✅ All existing admin functionality preserved

The system is ready for production use!