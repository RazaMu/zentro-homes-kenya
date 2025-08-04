# 🏠 Zentro Homes - Apartment Details Form

**Instructions for Apartment Manager:**
Please fill out all the fields below with accurate information for each property. This form will be used to upload the property details to our website and admin system.

---

## 📋 **PROPERTY BASIC INFORMATION**

### **Property Title** *
- **Field Name:** `title`
- **Description:** Full property name/title as it should appear on the website
- **Example:** "Ngong Road Luxury Apartment" or "Kilimani Modern Villa"
- **Your Entry:** ___________________________________

### **Property Type** *
- **Field Name:** `type`
- **Options:** Villa | Apartment | Penthouse | Condo
- **Your Selection:** ☐ Villa ☐ Apartment ☐ Penthouse ☐ Condo

### **Property Status** *
- **Field Name:** `status`
- **Options:** For Sale | For Rent
- **Your Selection:** ☐ For Sale ☐ For Rent

### **Price** *
- **Field Name:** `price`
- **Description:** Property price (numbers only, no commas)
- **Example:** 16780000 (for 16.78 million KES)
- **Your Entry:** ___________________________________

### **Currency** *
- **Field Name:** `currency`
- **Default:** KES (Kenyan Shillings)
- **Your Entry:** ___________________________________

---

## 📍 **LOCATION DETAILS**

### **Area/Neighborhood** *
- **Field Name:** `location_area`
- **Description:** Specific area or neighborhood name
- **Example:** "Kilimani", "Westlands", "Karen"
- **Your Entry:** ___________________________________

### **City** *
- **Field Name:** `location_city`
- **Description:** City name
- **Example:** "Nairobi", "Mombasa", "Kisumu"
- **Your Entry:** ___________________________________

### **Country**
- **Field Name:** `location_country`
- **Default:** Kenya
- **Your Entry:** ___________________________________

### **GPS Coordinates** (Optional)
- **Field Name:** `coordinates_lat` and `coordinates_lng`
- **Description:** Exact GPS location (if available)
- **Latitude:** ___________________________________
- **Longitude:** ___________________________________

---

## 🏡 **PROPERTY FEATURES**

### **Number of Bedrooms** *
- **Field Name:** `bedrooms`
- **Description:** Total number of bedrooms (numbers only)
- **Example:** 3, 4, 5
- **Your Entry:** ___________________________________

### **Number of Bathrooms** *
- **Field Name:** `bathrooms`
- **Description:** Total number of bathrooms (numbers only)
- **Example:** 2, 3, 4
- **Your Entry:** ___________________________________

### **Parking Spaces**
- **Field Name:** `parking`
- **Description:** Number of parking spaces available
- **Default:** 0 (if none)
- **Your Entry:** ___________________________________

### **Property Size** *
- **Field Name:** `size`
- **Description:** Total area in square meters (numbers only)
- **Example:** 150, 200, 300
- **Your Entry:** ___________________________________

### **Size Unit**
- **Field Name:** `size_unit`
- **Default:** m² (square meters)
- **Your Entry:** ___________________________________

### **Year Built** (Optional)
- **Field Name:** `year_built`
- **Description:** Year the property was constructed
- **Example:** 2020, 2018, 2023
- **Your Entry:** ___________________________________

### **Furnished Status**
- **Field Name:** `furnished`
- **Options:** Yes | No
- **Your Selection:** ☐ Yes (Fully Furnished) ☐ No (Unfurnished)

---

## 📝 **PROPERTY DESCRIPTIONS**

### **Full Description** *
- **Field Name:** `description`
- **Description:** Detailed description of the property (2-3 paragraphs)
- **Include:** Features, benefits, nearby amenities, unique selling points
- **Your Entry:**
```
__________________________________________________________________________
__________________________________________________________________________
__________________________________________________________________________
__________________________________________________________________________
__________________________________________________________________________
```

### **Short Description** (Optional)
- **Field Name:** `short_description`
- **Description:** Brief one-line summary (max 500 characters)
- **Example:** "Modern 3-bedroom apartment with stunning city views"
- **Your Entry:** ___________________________________

---

## 🎯 **AMENITIES & FEATURES**

### **Property Amenities**
- **Field Name:** `amenities`
- **Description:** List all available amenities separated by commas
- **Examples:** swimming pool, gym, security, garden, parking, elevator, balcony, air conditioning, internet, DSTV, backup generator, borehole water, etc.

**Your List:**
```
__________________________________________________________________________
__________________________________________________________________________
__________________________________________________________________________
```

---

## 📸 **MEDIA REQUIREMENTS**

### **Property Images** *
- **Field Name:** `images`
- **Requirements:** 
  - Minimum 3 images, maximum 10 images
  - First image will be the main/featured image
  - High quality (minimum 1024x768 pixels)
  - JPG, PNG, or WebP format
  - Maximum 10MB per image

**Image List:** (Please list the image files you'll provide)
1. **Main Image:** ___________________________________
2. **Image 2:** ___________________________________
3. **Image 3:** ___________________________________
4. **Image 4:** ___________________________________
5. **Image 5:** ___________________________________
6. **Image 6:** ___________________________________
7. **Image 7:** ___________________________________
8. **Image 8:** ___________________________________
9. **Image 9:** ___________________________________
10. **Image 10:** ___________________________________

### **YouTube Video URL** (Optional)
- **Field Name:** `virtual_tour_url`
- **Description:** YouTube link for property video tour or walkthrough
- **Example:** https://youtube.com/watch?v=abc123xyz
- **Your Entry:** ___________________________________

### **Virtual Tour URL** (Optional)
- **Field Name:** `virtual_tour_url`
- **Description:** Link to 360° virtual tour or other interactive media
- **Your Entry:** ___________________________________

---

## ⚙️ **PROPERTY STATUS SETTINGS**

### **Availability Status**
- **Field Name:** `available`
- **Description:** Is the property currently available?
- **Your Selection:** ☐ Available ☐ Not Available

### **Featured Property**
- **Field Name:** `featured`
- **Description:** Should this property be featured on the homepage?
- **Your Selection:** ☐ Yes (Featured) ☐ No (Regular listing)

### **Publication Status**
- **Field Name:** `published`
- **Description:** Should this property be visible on the website?
- **Your Selection:** ☐ Published (Visible to public) ☐ Draft (Not visible)

---

## 📋 **SUBMISSION CHECKLIST**

Before submitting this form, please ensure:

- [ ] All required fields (*) are completed
- [ ] Property description is detailed and accurate
- [ ] All amenities are listed
- [ ] Image files are ready and named clearly
- [ ] Contact information is provided below
- [ ] All information has been double-checked for accuracy

---

## 📞 **CONTACT INFORMATION**

**Property Manager Name:** ___________________________________

**Phone Number:** ___________________________________

**Email Address:** ___________________________________

**Date Completed:** ___________________________________

**Additional Notes:**
```
__________________________________________________________________________
__________________________________________________________________________
__________________________________________________________________________
```

---

## 📋 **ADMIN USE ONLY** (Do not fill)

- **Property ID:** ___________________________________
- **Date Uploaded:** ___________________________________
- **Uploaded By:** ___________________________________
- **Status:** ☐ Pending Review ☐ Approved ☐ Live on Website
- **Notes:** ___________________________________

---

## 🔍 **FIELD REFERENCE GUIDE**

**Required Fields (*):** Must be filled out for property to be uploaded
**Optional Fields:** Can be left blank if information is not available
**Database Field Names:** Technical names used in the system (for admin reference)

**Questions?** Contact the Zentro Homes admin team for assistance with completing this form.

---

*Thank you for providing detailed property information. Accurate and complete details help us showcase properties effectively to potential buyers and renters.*