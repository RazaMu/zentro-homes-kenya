# SUPABASE MEDIA STORAGE STRATEGY GUIDE
# Complete Implementation for Zentro Homes Picture & Video Hosting

================================================================================
## OVERVIEW: STRATEGY FOR MEDIA STORAGE WITH SUPABASE
================================================================================

This guide provides a complete strategy for implementing media storage using Supabase Storage for the Zentro Homes real estate website. Instead of storing files locally, all images and videos will be hosted on Supabase with proper database integration.

**Current Problem:** 
- Images stored locally in `wp-content/uploads/` folder
- Only file paths stored in database (not actual files)
- No video support
- Manual file management required

**Solution:**
- Use Supabase Storage buckets for file hosting
- Create proper media tables for metadata
- Implement file upload functionality in admin panel
- Enable automatic CDN delivery and optimization

================================================================================
## STEP 1: SUPABASE STORAGE SETUP
================================================================================

### 1.1 Enable Storage in Supabase Dashboard

1. **Go to your Supabase project dashboard**
   - Navigate to Storage > Buckets
   - Storage is automatically available in all Supabase projects

### 1.2 Create Storage Buckets

Create these buckets in your Supabase dashboard:

```bash
# Bucket Names to Create:
1. property-images    # For property photos
2. property-videos    # For property videos  
3. property-thumbnails # For video thumbnails and image previews
```

**For each bucket:**
1. Click "New Bucket"
2. Enter bucket name (e.g., `property-images`)
3. Set as **Public** (for website display)
4. Enable **File Size Limit**: 10MB for images, 100MB for videos
5. **Allowed MIME types**: 
   - Images: `image/jpeg,image/png,image/webp,image/gif`
   - Videos: `video/mp4,video/webm,video/mov`

### 1.3 Get Storage Configuration Details

From your Supabase dashboard, collect:

1. **Project URL**: `https://yqskldskeokvgigyrfnw.supabase.co`
2. **Anon Key**: (you already have this)
3. **Storage URL Pattern**: `https://yqskldskeokvgigyrfnw.supabase.co/storage/v1/object/public/[bucket-name]/[file-path]`

================================================================================
## STEP 2: DATABASE SCHEMA UPDATES
================================================================================

### 2.1 Create Media Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Create property_images table for detailed image metadata
CREATE TABLE property_images (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT REFERENCES properties(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    thumbnail_path TEXT, -- For optimized thumbnails
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property_videos table
CREATE TABLE property_videos (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT REFERENCES properties(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    duration INTEGER, -- Duration in seconds
    width INTEGER,
    height INTEGER,
    thumbnail_path TEXT, -- Video thumbnail
    title TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_property_images_property_id ON property_images(property_id);
CREATE INDEX idx_property_images_primary ON property_images(property_id, is_primary);
CREATE INDEX idx_property_videos_property_id ON property_videos(property_id);

-- Create triggers for updated_at
CREATE TRIGGER update_property_images_updated_at 
    BEFORE UPDATE ON property_images 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_videos_updated_at 
    BEFORE UPDATE ON property_videos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 Update Properties Table (Optional Enhancement)

```sql
-- Add media summary fields to properties table for quick access
ALTER TABLE properties 
ADD COLUMN primary_image_url TEXT,
ADD COLUMN total_images INTEGER DEFAULT 0,
ADD COLUMN total_videos INTEGER DEFAULT 0,
ADD COLUMN has_virtual_tour BOOLEAN DEFAULT false;

-- Create function to update media counts
CREATE OR REPLACE FUNCTION update_property_media_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update image count and primary image
    UPDATE properties 
    SET 
        total_images = (
            SELECT COUNT(*) 
            FROM property_images 
            WHERE property_id = COALESCE(NEW.property_id, OLD.property_id)
        ),
        primary_image_url = (
            SELECT storage_path 
            FROM property_images 
            WHERE property_id = COALESCE(NEW.property_id, OLD.property_id) 
            AND is_primary = true 
            LIMIT 1
        ),
        total_videos = (
            SELECT COUNT(*) 
            FROM property_videos 
            WHERE property_id = COALESCE(NEW.property_id, OLD.property_id)
        )
    WHERE id = COALESCE(NEW.property_id, OLD.property_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_media_counts_images
    AFTER INSERT OR UPDATE OR DELETE ON property_images
    FOR EACH ROW EXECUTE FUNCTION update_property_media_counts();

CREATE TRIGGER trigger_update_media_counts_videos
    AFTER INSERT OR UPDATE OR DELETE ON property_videos
    FOR EACH ROW EXECUTE FUNCTION update_property_media_counts();
```

================================================================================
## STEP 3: STORAGE SECURITY POLICIES
================================================================================

### 3.1 Row Level Security for Media Tables

```sql
-- Enable RLS on media tables
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_videos ENABLE ROW LEVEL SECURITY;

-- Allow public read access to media (for website display)
CREATE POLICY "Anyone can view property images" ON property_images
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view property videos" ON property_videos
    FOR SELECT USING (true);

-- Admin can manage media (authenticated users only)
CREATE POLICY "Authenticated users can manage images" ON property_images
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage videos" ON property_videos
    FOR ALL USING (auth.role() = 'authenticated');
```

### 3.2 Storage Bucket Policies

In your Supabase dashboard > Storage > Policies:

```sql
-- Allow public read access to property images
CREATE POLICY "Public can view property images" ON storage.objects
    FOR SELECT USING (bucket_id = 'property-images');

-- Allow public read access to property videos  
CREATE POLICY "Public can view property videos" ON storage.objects
    FOR SELECT USING (bucket_id = 'property-videos');

-- Allow public read access to thumbnails
CREATE POLICY "Public can view thumbnails" ON storage.objects
    FOR SELECT USING (bucket_id = 'property-thumbnails');

-- Allow authenticated users to upload/manage files
CREATE POLICY "Authenticated can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'property-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated can upload videos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'property-videos' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated can delete media" ON storage.objects
    FOR DELETE USING (
        (bucket_id = 'property-images' OR bucket_id = 'property-videos' OR bucket_id = 'property-thumbnails')
        AND auth.role() = 'authenticated'
    );
```

================================================================================
## STEP 4: JAVASCRIPT IMPLEMENTATION STRATEGY
================================================================================

 
Create `zentrohomes.com/js/supabase-media-manager.js`:

```javascript
class SupabaseMediaManager {
    constructor(supabaseClient) {
        this.client = supabaseClient;
        this.buckets = {
            images: 'property-images',
            videos: 'property-videos', 
            thumbnails: 'property-thumbnails'
        };
    }

    // Upload image file
    async uploadImage(file, propertyId, options = {}) {
        try {
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${propertyId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await this.client.storage
                .from(this.buckets.images)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = this.client.storage
                .from(this.buckets.images)
                .getPublicUrl(fileName);

            // Save metadata to database
            const imageData = {
                property_id: propertyId,
                storage_path: fileName,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                alt_text: options.altText || `Property image for listing ${propertyId}`,
                is_primary: options.isPrimary || false,
                display_order: options.displayOrder || 0
            };

            const { data: dbData, error: dbError } = await this.client
                .from('property_images')
                .insert(imageData)
                .select()
                .single();

            if (dbError) throw dbError;

            return {
                success: true,
                data: {
                    ...dbData,
                    public_url: urlData.publicUrl
                }
            };
        } catch (error) {
            console.error('Error uploading image:', error);
            return { success: false, error: error.message };
        }
    }

    // Upload video file
    async uploadVideo(file, propertyId, options = {}) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${propertyId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await this.client.storage
                .from(this.buckets.videos)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = this.client.storage
                .from(this.buckets.videos)
                .getPublicUrl(fileName);

            const videoData = {
                property_id: propertyId,
                storage_path: fileName,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                title: options.title || `Property video for listing ${propertyId}`,
                description: options.description || '',
                display_order: options.displayOrder || 0
            };

            const { data: dbData, error: dbError } = await this.client
                .from('property_videos')
                .insert(videoData)
                .select()
                .single();

            if (dbError) throw dbError;

            return {
                success: true,
                data: {
                    ...dbData,
                    public_url: urlData.publicUrl
                }
            };
        } catch (error) {
            console.error('Error uploading video:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all media for a property
    async getPropertyMedia(propertyId) {
        try {
            // Get images
            const { data: images, error: imgError } = await this.client
                .from('property_images')
                .select('*')
                .eq('property_id', propertyId)
                .order('display_order', { ascending: true });

            if (imgError) throw imgError;

            // Get videos
            const { data: videos, error: vidError } = await this.client
                .from('property_videos')
                .select('*')
                .eq('property_id', propertyId)
                .order('display_order', { ascending: true });

            if (vidError) throw vidError;

            // Add public URLs
            const imagesWithUrls = images.map(img => ({
                ...img,
                public_url: this.client.storage
                    .from(this.buckets.images)
                    .getPublicUrl(img.storage_path).data.publicUrl
            }));

            const videosWithUrls = videos.map(vid => ({
                ...vid,
                public_url: this.client.storage
                    .from(this.buckets.videos)
                    .getPublicUrl(vid.storage_path).data.publicUrl
            }));

            return {
                success: true,
                images: imagesWithUrls,
                videos: videosWithUrls
            };
        } catch (error) {
            console.error('Error fetching property media:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete media file
    async deleteMedia(mediaId, mediaType) {
        try {
            const table = mediaType === 'image' ? 'property_images' : 'property_videos';
            const bucket = mediaType === 'image' ? this.buckets.images : this.buckets.videos;

            // Get file path first
            const { data: mediaData, error: fetchError } = await this.client
                .from(table)
                .select('storage_path')
                .eq('id', mediaId)
                .single();

            if (fetchError) throw fetchError;

            // Delete from storage
            const { error: storageError } = await this.client.storage
                .from(bucket)
                .remove([mediaData.storage_path]);

            if (storageError) throw storageError;

            // Delete from database
            const { error: dbError } = await this.client
                .from(table)
                .delete()
                .eq('id', mediaId);

            if (dbError) throw dbError;

            return { success: true };
        } catch (error) {
            console.error('Error deleting media:', error);
            return { success: false, error: error.message };
        }
    }
}
```

### 4.2 Update Supabase Config

Add to your `supabase-config.js`:

```javascript
// Add to SUPABASE_CONFIG object
const SUPABASE_CONFIG = {
    // ... existing config
    
    storage: {
        buckets: {
            images: 'property-images',
            videos: 'property-videos',
            thumbnails: 'property-thumbnails'
        },
        maxFileSizes: {
            image: 10 * 1024 * 1024, // 10MB
            video: 100 * 1024 * 1024  // 100MB
        },
        allowedTypes: {
            images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            videos: ['video/mp4', 'video/webm', 'video/mov']
        }
    }
};

// Initialize media manager
let mediaManager;
document.addEventListener('DOMContentLoaded', function() {
    if (supabase) {
        mediaManager = new SupabaseMediaManager(supabase);
    }
});
```

================================================================================
## STEP 5: ADMIN PANEL FILE UPLOAD IMPLEMENTATION
================================================================================

### 5.1 Update Admin HTML

Add to your admin panel HTML:

```html
<!-- Add to property form in admin/index.html -->
<div class="form-group">
    <label>Property Images</label>
    <div class="file-upload-area">
        <input type="file" id="imageUpload" multiple accept="image/*" class="file-input">
        <div class="upload-zone" onclick="document.getElementById('imageUpload').click()">
            <div class="upload-icon">📷</div>
            <p>Drop images here or click to upload</p>
            <small>Max 10MB per image • JPG, PNG, WebP, GIF</small>
        </div>
    </div>
    <div id="imagePreview" class="media-preview"></div>
</div>

<div class="form-group">
    <label>Property Videos</label>
    <div class="file-upload-area">
        <input type="file" id="videoUpload" multiple accept="video/*" class="file-input">
        <div class="upload-zone" onclick="document.getElementById('videoUpload').click()">
            <div class="upload-icon">🎥</div>
            <p>Drop videos here or click to upload</p>
            <small>Max 100MB per video • MP4, WebM, MOV</small>
        </div>
    </div>
    <div id="videoPreview" class="media-preview"></div>
</div>
```

### 5.2 Add CSS for File Upload UI

```css
/* Add to admin styles */
.file-upload-area {
    margin-bottom: 15px;
}

.file-input {
    display: none;
}

.upload-zone {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 40px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.upload-zone:hover {
    border-color: #007bff;
    background-color: #f8f9fa;
}

.upload-zone.dragover {
    border-color: #007bff;
    background-color: #e3f2fd;
}

.upload-icon {
    font-size: 48px;
    margin-bottom: 10px;
}

.media-preview {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
    margin-top: 15px;
}

.media-item {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    background: #f5f5f5;
}

.media-item img,
.media-item video {
    width: 100%;
    height: 100px;
    object-fit: cover;
}

.media-item .remove-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    background: rgba(255, 0, 0, 0.8);
    color: white;
    border: none;
    border-radius: 50%;
    width: 25px;
    height: 25px;
    cursor: pointer;
    font-size: 12px;
}

.upload-progress {
    background: #e9ecef;
    border-radius: 4px;
    height: 4px;
    margin-top: 5px;
    overflow: hidden;
}

.upload-progress-bar {
    background: #007bff;
    height: 100%;
    transition: width 0.3s ease;
}
```

### 5.3 JavaScript for File Upload Handling

```javascript
// Add to admin JavaScript
class AdminMediaHandler {
    constructor() {
        this.setupFileUpload();
        this.pendingImages = [];
        this.pendingVideos = [];
    }

    setupFileUpload() {
        // Image upload handling
        const imageUpload = document.getElementById('imageUpload');
        const imagePreview = document.getElementById('imagePreview');
        
        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                this.handleImageFiles(e.target.files);
            });
        }

        // Video upload handling
        const videoUpload = document.getElementById('videoUpload');
        const videoPreview = document.getElementById('videoPreview');
        
        if (videoUpload) {
            videoUpload.addEventListener('change', (e) => {
                this.handleVideoFiles(e.target.files);
            });
        }

        // Drag and drop
        this.setupDragAndDrop();
    }

    handleImageFiles(files) {
        Array.from(files).forEach(file => {
            if (this.validateImageFile(file)) {
                this.addImageToPreview(file);
                this.pendingImages.push(file);
            }
        });
    }

    handleVideoFiles(files) {
        Array.from(files).forEach(file => {
            if (this.validateVideoFile(file)) {
                this.addVideoToPreview(file);
                this.pendingVideos.push(file);
            }
        });
    }

    validateImageFile(file) {
        const maxSize = SUPABASE_CONFIG.storage.maxFileSizes.image;
        const allowedTypes = SUPABASE_CONFIG.storage.allowedTypes.images;
        
        if (file.size > maxSize) {
            alert(`Image file ${file.name} is too large. Max size is ${maxSize / 1024 / 1024}MB`);
            return false;
        }
        
        if (!allowedTypes.includes(file.type)) {
            alert(`Image file ${file.name} has unsupported format. Allowed: ${allowedTypes.join(', ')}`);
            return false;
        }
        
        return true;
    }

    validateVideoFile(file) {
        const maxSize = SUPABASE_CONFIG.storage.maxFileSizes.video;
        const allowedTypes = SUPABASE_CONFIG.storage.allowedTypes.videos;
        
        if (file.size > maxSize) {
            alert(`Video file ${file.name} is too large. Max size is ${maxSize / 1024 / 1024}MB`);
            return false;
        }
        
        if (!allowedTypes.includes(file.type)) {
            alert(`Video file ${file.name} has unsupported format. Allowed: ${allowedTypes.join(', ')}`);
            return false;
        }
        
        return true;
    }

    addImageToPreview(file) {
        const preview = document.getElementById('imagePreview');
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            mediaItem.remove();
            this.pendingImages = this.pendingImages.filter(f => f !== file);
        };
        
        mediaItem.appendChild(img);
        mediaItem.appendChild(removeBtn);
        preview.appendChild(mediaItem);
    }

    addVideoToPreview(file) {
        const preview = document.getElementById('videoPreview');
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';
        
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = true;
        video.muted = true;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            mediaItem.remove();
            this.pendingVideos = this.pendingVideos.filter(f => f !== file);
        };
        
        mediaItem.appendChild(video);
        mediaItem.appendChild(removeBtn);
        preview.appendChild(mediaItem);
    }

    async uploadPendingMedia(propertyId) {
        const results = {
            images: [],
            videos: [],
            errors: []
        };

        // Upload images
        for (let i = 0; i < this.pendingImages.length; i++) {
            const file = this.pendingImages[i];
            const result = await mediaManager.uploadImage(file, propertyId, {
                isPrimary: i === 0,
                displayOrder: i
            });
            
            if (result.success) {
                results.images.push(result.data);
            } else {
                results.errors.push(`Image ${file.name}: ${result.error}`);
            }
        }

        // Upload videos
        for (let i = 0; i < this.pendingVideos.length; i++) {
            const file = this.pendingVideos[i];
            const result = await mediaManager.uploadVideo(file, propertyId, {
                displayOrder: i
            });
            
            if (result.success) {
                results.videos.push(result.data);
            } else {
                results.errors.push(`Video ${file.name}: ${result.error}`);
            }
        }

        // Clear pending files
        this.pendingImages = [];
        this.pendingVideos = [];
        
        return results;
    }

    setupDragAndDrop() {
        const uploadZones = document.querySelectorAll('.upload-zone');
        
        uploadZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('dragover');
            });
            
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('dragover');
            });
            
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('dragover');
                
                const files = Array.from(e.dataTransfer.files);
                const isImageZone = zone.closest('.form-group').querySelector('#imageUpload');
                
                if (isImageZone) {
                    this.handleImageFiles(files);
                } else {
                    this.handleVideoFiles(files);
                }
            });
        });
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    if (typeof mediaManager !== 'undefined') {
        new AdminMediaHandler();
    }
});
```

================================================================================
## STEP 6: INTEGRATION WITH EXISTING PROPERTY SYSTEM
================================================================================

### 6.1 Update Property Save Function

Modify your existing property save function in admin:

```javascript
async function saveProperty(propertyData) {
    try {
        // First save property to get ID
        const { data: property, error: propertyError } = await supabaseManager.client
            .from('properties')
            .insert(propertyData)
            .select()
            .single();

        if (propertyError) throw propertyError;

        // Upload pending media files
        const mediaResults = await adminMediaHandler.uploadPendingMedia(property.id);
        
        if (mediaResults.errors.length > 0) {
            console.warn('Some media files failed to upload:', mediaResults.errors);
        }

        // Show success message
        showAlert('Property and media saved successfully!', 'success');
        
        // Refresh property list
        loadProperties();
        
        return property;
        
    } catch (error) {
        console.error('Error saving property:', error);
        showAlert('Error saving property: ' + error.message, 'error');
        throw error;
    }
}
```

### 6.2 Update Property Display

Modify your property display to use Supabase media URLs:

```javascript
// Update the displayProperties function to show Supabase media
async function displayProperty(property) {
    // Get media for this property
    const mediaResult = await mediaManager.getPropertyMedia(property.id);
    
    if (mediaResult.success) {
        const { images, videos } = mediaResult;
        
        // Update property object with media URLs
        property.images = {
            main: images.find(img => img.is_primary)?.public_url || '../wp-content/uploads/2025/02/unsplash.jpg',
            gallery: images.filter(img => !img.is_primary).map(img => img.public_url)
        };
        
        property.videos = videos.map(vid => ({
            title: vid.title,
            url: vid.public_url,
            thumbnail: vid.thumbnail_path
        }));
    }
    
    // Continue with existing display logic...
}
```

================================================================================
## STEP 7: COST OPTIMIZATION STRATEGIES
================================================================================

### 7.1 Storage Optimization

1. **Image Compression**: Implement client-side image compression before upload
2. **Automatic Thumbnails**: Generate thumbnails for faster loading
3. **WebP Format**: Convert images to WebP for better compression
4. **CDN Caching**: Leverage Supabase's built-in CDN

### 7.2 Bandwidth Management

```javascript
// Add image compression before upload
async function compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(resolve, 'image/webp', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}
```

================================================================================
## STEP 8: MIGRATION FROM CURRENT SYSTEM
================================================================================

### 8.1 Migration Strategy

1. **Backup Current Images**: Copy existing images from `wp-content/uploads/`
2. **Upload to Supabase**: Batch upload existing images to Supabase Storage
3. **Update Database**: Update existing property records with new URLs
4. **Test System**: Verify all images display correctly
5. **Remove Local Files**: Clean up local file storage

### 8.2 Migration Script

```javascript
// Migration utility to move existing images to Supabase
class MediaMigrationTool {
    async migrateExistingImages() {
        try {
            // Get all properties with local image paths  
            const { data: properties, error } = await supabaseManager.client
                .from('properties')
                .select('id, main_image, gallery_images');

            if (error) throw error;

            for (const property of properties) {
                await this.migratePropertyImages(property);
            }

            console.log('Migration completed successfully');
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }

    async migratePropertyImages(property) {
        const imagesToMigrate = [];
        
        // Add main image
        if (property.main_image && property.main_image.startsWith('wp-content/')) {
            imagesToMigrate.push({
                path: property.main_image,
                isPrimary: true
            });
        }

        // Add gallery images
        if (property.gallery_images) {
            property.gallery_images.forEach(imgPath => {
                if (imgPath.startsWith('wp-content/')) {
                    imagesToMigrate.push({
                        path: imgPath,
                        isPrimary: false
                    });
                }
            });
        }

        // Upload each image to Supabase
        for (const imageInfo of imagesToMigrate) {
            await this.uploadLocalImageToSupabase(property.id, imageInfo);
        }
    }

    async uploadLocalImageToSupabase(propertyId, imageInfo) {
        try {
            // This would require server-side implementation to read local files
            // Or manual upload through admin panel
            console.log(`Need to migrate: ${imageInfo.path} for property ${propertyId}`);
        } catch (error) {
            console.error(`Failed to migrate ${imageInfo.path}:`, error);
        }
    }
}
```

================================================================================
## STEP 9: MONITORING AND MAINTENANCE
================================================================================

### 9.1 Storage Usage Monitoring

```javascript
// Add to admin dashboard
async function getStorageStats() {
    try {
        // Get bucket usage (requires service role key for detailed stats)
        const bucketNames = ['property-images', 'property-videos', 'property-thumbnails'];
        const stats = {};

        for (const bucket of bucketNames) {
            const { data: files, error } = await supabaseManager.client.storage
                .from(bucket)
                .list();

            if (!error) {
                stats[bucket] = {
                    fileCount: files.length,
                    // Detailed size calculation would need service role access
                };
            }
        }

        return stats;
    } catch (error) {
        console.error('Error getting storage stats:', error);
        return {};
    }
}
```

### 9.2 Cleanup Utilities

```javascript
// Utility to clean up orphaned media files
async function cleanupOrphanedMedia() {
    try {
        // Find images without corresponding properties
        const { data: orphanedImages } = await supabaseManager.client
            .from('property_images')
            .select('id, storage_path, property_id')
            .not('property_id', 'in', `(
                SELECT id FROM properties
            )`);

        // Delete orphaned images
        for (const image of orphanedImages) {
            await mediaManager.deleteMedia(image.id, 'image');
        }

        console.log(`Cleaned up ${orphanedImages.length} orphaned images`);
    } catch (error) {
        console.error('Error cleaning up media:', error);
    }
}
```

================================================================================
## STEP 10: IMPLEMENTATION CHECKLIST
================================================================================

### Phase 1: Setup (Day 1)
- [ ] Create Supabase Storage buckets
- [ ] Configure bucket policies and security
- [ ] Run database schema updates (media tables)
- [ ] Update supabase-config.js with storage configuration

### Phase 2: Core Implementation (Day 2-3)
- [ ] Create SupabaseMediaManager class
- [ ] Update admin panel HTML with file upload UI
- [ ] Add CSS for file upload interface
- [ ] Implement AdminMediaHandler class

### Phase 3: Integration (Day 4)
- [ ] Update property save/edit functions
- [ ] Modify property display to use Supabase URLs
- [ ] Test file upload functionality
- [ ] Test media deletion

### Phase 4: Migration (Day 5)
- [ ] Backup existing images
- [ ] Upload existing images to Supabase (manual or scripted)
- [ ] Update database records with new URLs
- [ ] Verify all images display correctly

### Phase 5: Optimization (Day 6)
- [ ] Implement image compression
- [ ] Add loading states and progress bars
- [ ] Setup error handling and retry logic
- [ ] Create cleanup utilities

### Testing Checklist
- [ ] Upload different image formats (JPG, PNG, WebP, GIF)
- [ ] Upload different video formats (MP4, WebM, MOV)
- [ ] Test file size limits
- [ ] Test multiple file upload
- [ ] Test drag and drop functionality
- [ ] Test image/video deletion
- [ ] Test property display with Supabase media
- [ ] Test admin panel across different browsers
- [ ] Test mobile responsiveness of file upload UI
- [ ] Verify CDN delivery and caching

================================================================================
## EXPECTED BENEFITS AFTER IMPLEMENTATION
================================================================================

1. **Professional Media Management**
   - Cloud-hosted images and videos
   - Automatic CDN delivery for fast loading
   - Proper metadata tracking

2. **Improved Performance**
   - Optimized image delivery
   - Reduced server storage requirements
   - Better caching strategies

3. **Enhanced Admin Experience**
   - Drag-and-drop file uploads
   - Real-time preview functionality
   - Batch media operations

4. **Scalability**
   - No local storage limitations
   - Automatic backups via Supabase
   - Easy integration with mobile apps

5. **Cost Efficiency**
   - Pay-as-you-use storage pricing
   - Automatic image optimization
   - Reduced bandwidth costs

================================================================================

This comprehensive guide provides everything needed to implement professional media storage for the Zentro Homes website using Supabase Storage. The implementation will transform your current local file system into a cloud-based, scalable media management solution.