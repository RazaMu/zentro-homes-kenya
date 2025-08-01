// Script to check image URLs in Supabase database
// This will help identify any localhost URLs that need to be fixed

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_CONFIG = {
  url: 'https://yqskldskeokvgigyrfnw.supabase.co',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxc2tsZHNrZW9rdmdpZ3lyZm53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY4NDQwMywiZXhwIjoyMDY5MjYwNDAzfQ.51ZXyxnjeXUhrrufQrnZOh5-uo67N8Za6Qsz3Bm1TF4'
};

// Initialize Supabase client with service role key for full access
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceKey);

async function checkImageUrls() {
  try {
    console.log('🔍 Checking image URLs in Supabase database...\n');

    // First, let's check what columns exist in the properties table
    console.log('📋 Checking table schema...');
    const { data: schemaCheck, error: schemaError } = await supabase
      .from('properties')
      .select('*')
      .limit(1);

    if (schemaError) {
      throw schemaError;
    }

    if (schemaCheck.length > 0) {
      console.log('Available columns:', Object.keys(schemaCheck[0]).join(', '));
    }

    // Query properties table - using * to get all columns first
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (propertiesError) {
      throw propertiesError;
    }

    console.log(`📊 Found ${properties.length} properties in database\n`);

    let localhostCount = 0;
    let validUrlCount = 0;
    let emptyCount = 0;

    properties.forEach((property, index) => {
      console.log(`\n--- Property ${index + 1}: ${property.title || property.name || 'Untitled'} (ID: ${property.id}) ---`);
      
      // Function to check and report on a URL
      const checkUrl = (url, label) => {
        if (url) {
          console.log(`${label}: ${url}`);
          if (url.includes('localhost') || url.includes(':8000')) {
            console.log(`❌ LOCALHOST URL DETECTED in ${label.toLowerCase()}!`);
            localhostCount++;
          } else if (url.includes('supabase.co') || url.startsWith('https://')) {
            console.log('✅ Valid URL');
            validUrlCount++;
          } else {
            console.log('⚠️  Potentially problematic URL');
          }
        } else {
          console.log(`${label}: (empty)`);
          emptyCount++;
        }
      };

      // Check various possible image column names
      const imageColumns = ['main_image', 'image_url', 'primary_image', 'featured_image', 'image'];
      let foundMainImage = false;
      
      imageColumns.forEach(col => {
        if (property[col] !== undefined) {
          checkUrl(property[col], `Main Image (${col})`);
          foundMainImage = true;
        }
      });

      if (!foundMainImage) {
        console.log('Main Image: (no image column found)');
        emptyCount++;
      }

      // Check gallery images (could be in different formats)
      const galleryColumns = ['gallery_images', 'images', 'image_gallery', 'additional_images'];
      let foundGallery = false;

      galleryColumns.forEach(col => {
        if (property[col] !== undefined) {
          foundGallery = true;
          if (Array.isArray(property[col])) {
            console.log(`Gallery Images (${col}) - ${property[col].length} images:`);
            property[col].forEach((imageUrl, imgIndex) => {
              console.log(`  ${imgIndex + 1}. ${imageUrl}`);
              if (imageUrl.includes('localhost') || imageUrl.includes(':8000')) {
                console.log('     ❌ LOCALHOST URL DETECTED!');
                localhostCount++;
              } else if (imageUrl.includes('supabase.co') || imageUrl.startsWith('https://')) {
                console.log('     ✅ Valid URL');
                validUrlCount++;
              } else {
                console.log('     ⚠️  Potentially problematic URL');
              }
            });
          } else if (property[col]) {
            console.log(`Gallery Images (${col}): ${property[col]} (not an array)`);
          }
        }
      });

      if (!foundGallery) {
        console.log('Gallery Images: (no gallery column found)');
      }

      // Show all available columns for debugging
      console.log(`Available columns: ${Object.keys(property).join(', ')}`);
    });

    // Summary
    console.log('\n\n📈 SUMMARY:');
    console.log(`Total properties: ${properties.length}`);
    console.log(`Localhost URLs found: ${localhostCount}`);
    console.log(`Valid URLs: ${validUrlCount}`);
    console.log(`Empty image fields: ${emptyCount}`);

    if (localhostCount > 0) {
      console.log('\n❌ ACTION REQUIRED: Found localhost URLs that need to be updated!');
      console.log('These URLs will cause 404 errors in production.');
      console.log('Images should be uploaded to Supabase Storage and URLs updated.');
    } else {
      console.log('\n✅ No localhost URLs found - all good!');
    }

    // Also check property_images table if it exists
    console.log('\n\n🔍 Checking property_images table...');
    const { data: propertyImages, error: imagesError } = await supabase
      .from('property_images')
      .select('id, property_id, image_url, alt_text')
      .order('property_id');

    if (imagesError) {
      console.log('⚠️  property_images table not found or error:', imagesError.message);
    } else {
      console.log(`📊 Found ${propertyImages.length} images in property_images table\n`);
      
      let imageLocalhostCount = 0;
      propertyImages.forEach((image, index) => {
        console.log(`Image ${index + 1} (Property ID: ${image.property_id}): ${image.image_url}`);
        if (image.image_url.includes('localhost') || image.image_url.includes(':8000')) {
          console.log('  ❌ LOCALHOST URL DETECTED!');
          imageLocalhostCount++;
        } else {
          console.log('  ✅ Valid URL');
        }
      });

      console.log(`\nProperty Images Table Summary:`);
      console.log(`Total images: ${propertyImages.length}`);
      console.log(`Localhost URLs: ${imageLocalhostCount}`);
    }

  } catch (error) {
    console.error('❌ Error checking image URLs:', error.message);
    console.error('Full error:', error);
  }
}

// Run the check
checkImageUrls();