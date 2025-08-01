/**
 * Touch Interactions for Zentro Homes
 * This file contains touch-specific interactions for mobile devices
 */

class TouchInteractions {
  constructor() {
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.swipeIndicatorsShown = {};
    this.init();
  }

  init() {
    if (!this.isTouchDevice) return;
    
    // Add touch-specific classes to the body
    document.body.classList.add('touch-device');
    
    // Initialize touch interactions
    this.initGallerySwipe();
    this.initCarouselSwipe();
    this.initVideoPlayerSwipe();
    this.initTouchFeedback();
    this.initTouchMenus();
    this.enhanceTouchTargets();
    this.initSwipeIndicators();
  }

  /**
   * Initialize swipe gestures for image galleries
   */
  initGallerySwipe() {
    // Find all gallery containers
    const galleries = document.querySelectorAll('.property-gallery, .gallery-modal');
    
    galleries.forEach(gallery => {
      let touchStartX = 0;
      let touchEndX = 0;
      let touchStartY = 0;
      let touchEndY = 0;
      
      gallery.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        // Add visual feedback for touch
        gallery.classList.add('touch-active-gallery');
      }, { passive: true });
      
      gallery.addEventListener('touchmove', (e) => {
        const currentX = e.changedTouches[0].screenX;
        const swipeDistance = currentX - touchStartX;
        
        // Add visual feedback during swipe
        if (Math.abs(swipeDistance) > 30) {
          const direction = swipeDistance > 0 ? 'right' : 'left';
          gallery.setAttribute('data-swipe-direction', direction);
        }
      }, { passive: true });
      
      gallery.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        
        // Remove visual feedback
        gallery.classList.remove('touch-active-gallery');
        gallery.removeAttribute('data-swipe-direction');
        
        this.handleGallerySwipe(gallery, touchStartX, touchEndX, touchStartY, touchEndY);
      }, { passive: true });
      
      gallery.addEventListener('touchcancel', () => {
        gallery.classList.remove('touch-active-gallery');
        gallery.removeAttribute('data-swipe-direction');
      }, { passive: true });
    });
  }

  /**
   * Handle swipe gestures for galleries
   */
  handleGallerySwipe(gallery, touchStartX, touchEndX, touchStartY, touchEndY) {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    const verticalDistance = Math.abs(touchEndY - touchStartY);
    
    // Only process if it's a significant horizontal swipe and not primarily vertical
    if (Math.abs(swipeDistance) < swipeThreshold || verticalDistance > Math.abs(swipeDistance) * 1.5) return;
    
    // Check if we're in the modal or main gallery
    const isModal = gallery.classList.contains('gallery-modal');
    
    // Add haptic feedback if available
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    
    if (swipeDistance < 0) {
      // Swipe left - next image
      if (isModal && window.apartmentDetails) {
        window.apartmentDetails.nextImage();
        this.showSwipeIndicator(gallery, 'next');
      } else if (window.apartmentDetails) {
        // Find the current image index and move to next
        const currentIndex = parseInt(document.querySelector('.thumbnail.active')?.dataset.index || 0);
        const nextIndex = currentIndex + 1;
        const nextThumb = document.querySelector(`.thumbnail[data-index="${nextIndex}"]`);
        
        if (nextThumb) {
          window.apartmentDetails.changeMainImage(nextIndex);
          this.showSwipeIndicator(gallery, 'next');
        }
      }
    } else {
      // Swipe right - previous image
      if (isModal && window.apartmentDetails) {
        window.apartmentDetails.prevImage();
        this.showSwipeIndicator(gallery, 'prev');
      } else if (window.apartmentDetails) {
        // Find the current image index and move to previous
        const currentIndex = parseInt(document.querySelector('.thumbnail.active')?.dataset.index || 0);
        const prevIndex = currentIndex - 1;
        const prevThumb = document.querySelector(`.thumbnail[data-index="${prevIndex}"]`);
        
        if (prevThumb && prevIndex >= 0) {
          window.apartmentDetails.changeMainImage(prevIndex);
          this.showSwipeIndicator(gallery, 'prev');
        }
      }
    }
  }

  /**
   * Initialize swipe gestures for carousels
   */
  initCarouselSwipe() {
    // Find all carousel containers
    const carousels = document.querySelectorAll('.similar-properties-grid, .unique-listings-grid');
    
    carousels.forEach(carousel => {
      let touchStartX = 0;
      let touchEndX = 0;
      let touchStartY = 0;
      let touchEndY = 0;
      let startTime = 0;
      let scrollStartPosition = 0;
      let isSwiping = false;
      
      // Add snap scrolling for better touch experience
      carousel.style.scrollSnapType = 'x mandatory';
      
      // Add snap align to carousel items
      const items = carousel.querySelectorAll('.similar-property-card, .unique-card');
      items.forEach(item => {
        item.style.scrollSnapAlign = 'center';
      });
      
      carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        startTime = new Date().getTime();
        scrollStartPosition = carousel.scrollLeft;
        isSwiping = true;
        
        // Show swipe indicator on first interaction
        if (!this.swipeIndicatorsShown[carousel.id]) {
          this.showSwipeIndicator(carousel, 'carousel');
          this.swipeIndicatorsShown[carousel.id] = true;
        }
      }, { passive: true });
      
      carousel.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        
        const currentX = e.changedTouches[0].screenX;
        const currentY = e.changedTouches[0].screenY;
        const deltaX = touchStartX - currentX;
        const deltaY = Math.abs(touchStartY - currentY);
        
        // If primarily vertical scrolling, don't interfere
        if (deltaY > Math.abs(deltaX) * 1.5) {
          isSwiping = false;
          return;
        }
        
        // Add resistance at the edges
        if ((scrollStartPosition <= 0 && deltaX < 0) || 
            (scrollStartPosition >= carousel.scrollWidth - carousel.clientWidth && deltaX > 0)) {
          // Apply resistance at the edges
          carousel.scrollLeft = scrollStartPosition + (deltaX * 0.3);
        } else {
          carousel.scrollLeft = scrollStartPosition + deltaX;
        }
      }, { passive: true });
      
      carousel.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        const endTime = new Date().getTime();
        const timeElapsed = endTime - startTime;
        
        this.handleCarouselSwipe(carousel, touchStartX, touchEndX, touchStartY, touchEndY, timeElapsed, scrollStartPosition);
        isSwiping = false;
      }, { passive: true });
    });
  }

  /**
   * Handle swipe gestures for carousels
   */
  handleCarouselSwipe(carousel, touchStartX, touchEndX, touchStartY, touchEndY, timeElapsed, scrollStartPosition) {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    const verticalDistance = Math.abs(touchEndY - touchStartY);
    
    // Only process if it's a significant horizontal swipe and not primarily vertical
    if (Math.abs(swipeDistance) < swipeThreshold || verticalDistance > Math.abs(swipeDistance) * 1.5) {
      // Snap to the nearest item
      this.snapToNearestItem(carousel);
      return;
    }
    
    // Calculate momentum scrolling
    if (timeElapsed < 300) {
      // Fast swipe - add momentum
      const momentum = swipeDistance * 3;
      const targetScroll = scrollStartPosition - momentum;
      
      // Smooth scroll to the target position
      carousel.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
      
      // After momentum scrolling, snap to nearest item
      setTimeout(() => {
        this.snapToNearestItem(carousel);
      }, 300);
    } else {
      // Slow swipe - just snap to nearest item
      this.snapToNearestItem(carousel);
    }
    
    // Add haptic feedback if available
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(30);
    }
  }
  
  /**
   * Snap carousel to nearest item after scrolling
   */
  snapToNearestItem(carousel) {
    const items = carousel.querySelectorAll('.similar-property-card, .unique-card');
    if (!items.length) return;
    
    let minDistance = Infinity;
    let targetItem = null;
    const carouselLeft = carousel.scrollLeft;
    const carouselCenter = carouselLeft + (carousel.offsetWidth / 2);
    
    items.forEach(item => {
      const itemLeft = item.offsetLeft;
      const itemCenter = itemLeft + (item.offsetWidth / 2);
      const distance = Math.abs(carouselCenter - itemCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        targetItem = item;
      }
    });
    
    if (targetItem) {
      const targetLeft = targetItem.offsetLeft - ((carousel.offsetWidth - targetItem.offsetWidth) / 2);
      carousel.scrollTo({
        left: targetLeft,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Initialize swipe gestures for video player
   */
  initVideoPlayerSwipe() {
    const videoPlayer = document.getElementById('property-video');
    if (!videoPlayer) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    let touchStartTime = 0;
    
    videoPlayer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      touchStartTime = new Date().getTime();
    }, { passive: true });
    
    videoPlayer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      const touchEndTime = new Date().getTime();
      const touchDuration = touchEndTime - touchStartTime;
      
      // Handle video player touch interactions
      this.handleVideoPlayerTouch(videoPlayer, touchStartX, touchEndX, touchStartY, touchEndY, touchDuration);
    }, { passive: true });
  }
  
  /**
   * Handle touch interactions for video player
   */
  handleVideoPlayerTouch(videoPlayer, touchStartX, touchEndX, touchStartY, touchEndY, touchDuration) {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    const verticalDistance = Math.abs(touchEndY - touchStartY);
    
    // Short tap - toggle play/pause
    if (Math.abs(swipeDistance) < 20 && verticalDistance < 20 && touchDuration < 300) {
      if (videoPlayer.paused) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
      return;
    }
    
    // Only process if it's a significant horizontal swipe and not primarily vertical
    if (Math.abs(swipeDistance) < swipeThreshold || verticalDistance > Math.abs(swipeDistance)) return;
    
    // Add haptic feedback if available
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    
    if (swipeDistance < 0) {
      // Swipe left - forward 10 seconds
      videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
      this.showVideoSeekIndicator(videoPlayer, 'forward');
    } else {
      // Swipe right - backward 10 seconds
      videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
      this.showVideoSeekIndicator(videoPlayer, 'backward');
    }
  }
  
  /**
   * Show video seek indicator
   */
  showVideoSeekIndicator(videoPlayer, direction) {
    // Remove any existing indicators
    const existingIndicator = document.querySelector('.video-seek-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Create new indicator
    const indicator = document.createElement('div');
    indicator.className = 'video-seek-indicator';
    
    if (direction === 'forward') {
      indicator.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 4 15 12 5 20 5 4"></polygon>
          <polygon points="13 4 23 12 13 20 13 4"></polygon>
        </svg>
        <span>+10s</span>
      `;
    } else {
      indicator.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="19 20 9 12 19 4 19 20"></polygon>
          <polygon points="11 20 1 12 11 4 11 20"></polygon>
        </svg>
        <span>-10s</span>
      `;
    }
    
    // Add to video container
    const videoContainer = videoPlayer.closest('.video-player-wrapper');
    if (videoContainer) {
      videoContainer.appendChild(indicator);
      
      // Remove after animation
      setTimeout(() => {
        indicator.classList.add('fade-out');
        setTimeout(() => {
          indicator.remove();
        }, 500);
      }, 1000);
    }
  }

  /**
   * Initialize touch feedback for interactive elements
   */
  initTouchFeedback() {
    // Add active state for buttons and links on touch
    const interactiveElements = document.querySelectorAll('a, button, .btn, .property-card, .similar-property-card, .unique-card, .thumbnail, .video-control-btn, .video-progress, .video-volume-slider');
    
    interactiveElements.forEach(element => {
      element.addEventListener('touchstart', () => {
        element.classList.add('touch-active');
      }, { passive: true });
      
      element.addEventListener('touchend', () => {
        setTimeout(() => {
          element.classList.remove('touch-active');
        }, 200);
      }, { passive: true });
      
      element.addEventListener('touchcancel', () => {
        element.classList.remove('touch-active');
      }, { passive: true });
    });
  }

  /**
   * Initialize touch-friendly menus
   */
  initTouchMenus() {
    // Make dropdown menus more touch-friendly
    const dropdownTriggers = document.querySelectorAll('.has_submenu > a');
    
    dropdownTriggers.forEach(trigger => {
      trigger.addEventListener('touchend', (e) => {
        // Only handle touch events on mobile
        if (window.innerWidth <= 991) {
          const parent = trigger.parentElement;
          
          // Toggle active state
          if (parent.classList.contains('active')) {
            parent.classList.remove('active');
          } else {
            // Close other open menus
            document.querySelectorAll('.has_submenu.active').forEach(item => {
              if (item !== parent) {
                item.classList.remove('active');
              }
            });
            
            parent.classList.add('active');
          }
          
          e.preventDefault();
        }
      }, { passive: false });
    });
    
    // Close menus when touching outside
    document.addEventListener('touchend', (e) => {
      if (!e.target.closest('.has_submenu')) {
        document.querySelectorAll('.has_submenu.active').forEach(item => {
          item.classList.remove('active');
        });
      }
    }, { passive: true });
  }
  
  /**
   * Enhance touch targets for better mobile experience
   */
  enhanceTouchTargets() {
    // Enhance video controls for touch
    const videoControls = document.querySelectorAll('.video-control-btn, .video-progress, .video-volume-slider');
    videoControls.forEach(control => {
      control.classList.add('touch-enhanced');
    });
    
    // Enhance gallery thumbnails for touch
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumbnail => {
      thumbnail.classList.add('touch-enhanced');
    });
    
    // Enhance form elements for touch
    const formElements = document.querySelectorAll('input, select, textarea, button');
    formElements.forEach(element => {
      element.classList.add('touch-enhanced');
    });
    
    // Add double-tap to zoom for main image
    const mainImage = document.getElementById('main-image');
    if (mainImage) {
      let lastTap = 0;
      let zoomedIn = false;
      
      mainImage.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 300 && tapLength > 0) {
          // Double tap detected
          e.preventDefault();
          
          if (!zoomedIn) {
            // Get tap position
            const touch = e.changedTouches[0];
            const rect = mainImage.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // Calculate position as percentage
            const xPercent = (x / rect.width) * 100;
            const yPercent = (y / rect.height) * 100;
            
            // Zoom in at tap position
            mainImage.style.transformOrigin = `${xPercent}% ${yPercent}%`;
            mainImage.style.transform = 'scale(2)';
            zoomedIn = true;
          } else {
            // Zoom out
            mainImage.style.transform = 'none';
            zoomedIn = false;
          }
          
          // Add haptic feedback if available
          if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
          }
        }
        
        lastTap = currentTime;
      });
    }
  }
  
  /**
   * Initialize swipe indicators for touch devices
   */
  initSwipeIndicators() {
    // Find all elements that should show swipe indicators
    const swipeElements = document.querySelectorAll('.property-gallery, .similar-properties-grid, .gallery-modal');
    
    swipeElements.forEach(element => {
      // Show swipe indicator on first page load
      this.showSwipeIndicator(element, element.classList.contains('similar-properties-grid') ? 'carousel' : 'gallery');
    });
  }
  
  /**
   * Show swipe indicator for an element
   */
  showSwipeIndicator(element, type) {
    // Check if indicator already exists
    if (element.querySelector('.swipe-indicator')) return;
    
    // Create indicator element
    const indicator = document.createElement('div');
    indicator.className = 'swipe-indicator';
    
    // Set indicator content based on type
    if (type === 'next') {
      indicator.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
        <span>Next</span>
      `;
    } else if (type === 'prev') {
      indicator.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        <span>Previous</span>
      `;
    } else if (type === 'carousel') {
      indicator.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 8l4 4-4 4M7 8l-4 4 4 4"/>
        </svg>
        <span>Swipe to browse</span>
      `;
    } else {
      indicator.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 8l4 4-4 4M7 8l-4 4 4 4"/>
        </svg>
        <span>Swipe to navigate</span>
      `;
    }
    
    // Add indicator to element
    element.appendChild(indicator);
    
    // Fade out and remove after delay
    setTimeout(() => {
      indicator.classList.add('fade-out');
      setTimeout(() => {
        if (indicator.parentNode === element) {
          element.removeChild(indicator);
        }
      }, 1000);
    }, 2000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.touchInteractions = new TouchInteractions();
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.touchInteractions = new TouchInteractions();
});