class SupabaseMediaManager {
    constructor(supabaseClient) {
        this.client = supabaseClient;
        this.buckets = {
            images: 'property-images',
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

    // YouTube URL management (no video uploads needed)
    validateYouTubeUrl(url) {
        if (!url) return { isValid: false, message: 'No URL provided' };
        
        const youtubePatterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
        ];
        
        for (const pattern of youtubePatterns) {
            if (pattern.test(url)) {
                return { isValid: true, message: 'Valid YouTube URL' };
            }
        }
        
        return { isValid: false, message: 'Invalid YouTube URL format' };
    }

    // Get all media for a property (images only - YouTube handled in property data)
    async getPropertyMedia(propertyId) {
        try {
            // Get images
            const { data: images, error: imgError } = await this.client
                .from('property_images')
                .select('*')
                .eq('property_id', propertyId)
                .order('display_order', { ascending: true });

            if (imgError) throw imgError;

            // Add public URLs to images
            const imagesWithUrls = images.map(img => ({
                ...img,
                public_url: this.client.storage
                    .from(this.buckets.images)
                    .getPublicUrl(img.storage_path).data.publicUrl
            }));

            return {
                success: true,
                images: imagesWithUrls
            };
        } catch (error) {
            console.error('Error fetching property media:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete image file (videos are now YouTube URLs, no file deletion needed)
    async deleteImage(imageId) {
        try {
            // Get file path first
            const { data: imageData, error: fetchError } = await this.client
                .from('property_images')
                .select('storage_path')
                .eq('id', imageId)
                .single();

            if (fetchError) throw fetchError;

            // Delete from storage
            const { error: storageError } = await this.client.storage
                .from(this.buckets.images)
                .remove([imageData.storage_path]);

            if (storageError) throw storageError;

            // Delete from database
            const { error: dbError } = await this.client
                .from('property_images')
                .delete()
                .eq('id', imageId);

            if (dbError) throw dbError;

            return { success: true };
        } catch (error) {
            console.error('Error deleting image:', error);
            return { success: false, error: error.message };
        }
    }
}