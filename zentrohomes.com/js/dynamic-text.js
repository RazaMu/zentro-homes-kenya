// Dynamic Text Animation for Zentro Homes
document.addEventListener('DOMContentLoaded', function() {
    // Function to initialize typing animation
    function initTypingAnimation() {
        const section = document.querySelector('.typing-animation');
        if (!section) return;
        
        const words = section.querySelectorAll('.word');
        const wordCount = words.length;
        
        if (!words.length) {
            console.log('Dynamic text elements not found in section');
            return;
        }
        
        // Initialize variables
        let currentWordIndex = 0;
        let isDeleting = false;
        let text = '';
        let charIndex = 0;
        
        // Timing (in milliseconds)
        const typingSpeed = 100;
        const deletingSpeed = 50;
        const pauseBeforeDelete = 2000;
        const pauseBeforeType = 500;
        
        // Find the longest word to set a consistent width
        let maxLength = 0;
        let longestWord = '';
        
        words.forEach(word => {
            if (word.textContent.length > maxLength) {
                maxLength = word.textContent.length;
                longestWord = word.textContent;
            }
        });
        
        // Create a hidden element to measure the width
        const measurer = document.createElement('span');
        measurer.style.visibility = 'hidden';
        measurer.style.position = 'absolute';
        measurer.style.fontSize = window.getComputedStyle(words[0]).fontSize;
        measurer.style.fontFamily = window.getComputedStyle(words[0]).fontFamily;
        measurer.style.fontWeight = window.getComputedStyle(words[0]).fontWeight;
        measurer.textContent = longestWord;
        document.body.appendChild(measurer);
        
        // Set a consistent width for the word wrapper
        const wordWrapper = section.querySelector('.word-wrapper');
        if (wordWrapper) {
            wordWrapper.style.minWidth = (measurer.offsetWidth + 10) + 'px';
        }
        
        // Remove the measurer
        document.body.removeChild(measurer);
        
        // Set initial state - hide all words
        words.forEach(word => {
            word.classList.remove('active');
            // Store original text in a data attribute
            word.dataset.originalText = word.textContent;
            word.textContent = '';
        });
        
        // Make first word active
        words[0].classList.add('active');
        
        function type() {
            // Get the current word's original text
            const currentWord = words[currentWordIndex];
            const originalText = currentWord.dataset.originalText;
            
            // Set the text based on whether we're typing or deleting
            if (isDeleting) {
                // Remove a character
                text = originalText.substring(0, charIndex - 1);
                charIndex--;
            } else {
                // Add a character
                text = originalText.substring(0, charIndex + 1);
                charIndex++;
            }
            
            // Update the current word's text
            currentWord.textContent = text;
            
            // Determine next action
            if (!isDeleting && charIndex === originalText.length) {
                // Finished typing the word, pause then start deleting
                isDeleting = true;
                setTimeout(type, pauseBeforeDelete);
            } else if (isDeleting && charIndex === 0) {
                // Finished deleting, move to next word
                isDeleting = false;
                currentWord.classList.remove('active');
                currentWordIndex = (currentWordIndex + 1) % wordCount;
                words[currentWordIndex].classList.add('active');
                setTimeout(type, pauseBeforeType);
            } else {
                // Continue typing or deleting
                setTimeout(type, isDeleting ? deletingSpeed : typingSpeed);
            }
        }
        
        // Start the typing animation
        setTimeout(type, pauseBeforeType);
    }
    
    // Function to initialize fade animation for regular dynamic text
    function initFadeAnimation(wrapperSelector, interval = 2000) {
        // Get all the dynamic text sections (except typing animation)
        const dynamicTextSections = document.querySelectorAll(wrapperSelector);
        
        dynamicTextSections.forEach(section => {
            // Skip if this has the typing-animation class
            if (section.classList.contains('typing-animation')) return;
            
            // Get all words in this section
            const words = section.querySelectorAll('.word');
            const wordWrapper = section.querySelector('.word-wrapper');
            
            if (!words.length || !wordWrapper) {
                console.log('Dynamic text elements not found in section');
                return;
            }
            
            // Set initial state - hide all words except the first one
            words.forEach((word, index) => {
                if (index === 0) {
                    word.classList.add('active');
                } else {
                    word.classList.remove('active');
                }
            });
            
            // Function to cycle through words
            let currentIndex = 0;
            const wordCount = words.length;
            
            function cycleWords() {
                // Remove active class from current word
                words[currentIndex].classList.remove('active');
                
                // Move to next word or back to first
                currentIndex = (currentIndex + 1) % wordCount;
                
                // Add active class to new word
                words[currentIndex].classList.add('active');
            }
            
            // Set interval for cycling words
            setInterval(cycleWords, interval);
        });
    }
    
    // Initialize regular dynamic text with fade animation
    initFadeAnimation('.dynamic-text', 2000);
    
    // Initialize typing animation
    initTypingAnimation();
});