// Login Fix for Username/Password Authentication
// This script patches the admin login to properly handle username authentication

document.addEventListener('DOMContentLoaded', function() {
  // Override the admin login method if it exists
  if (window.zentroAdmin) {
    // console.log('🔧 Applying login fix for username authentication...');
    
    // Store original method
    const originalHandleLogin = window.zentroAdmin.handleLogin;
    
    // Override with corrected logic
    window.zentroAdmin.handleLogin = async function() {
      const username = (document.getElementById('loginEmail') || document.getElementById('username')).value;
      const password = (document.getElementById('loginPassword') || document.getElementById('password')).value;
      
      if (!username || !password) {
        this.showNotification('Please enter username and password', 'error');
        return;
      }

      try {
        this.setLoading(true);
        
        // Direct API call to backend authentication with corrected field names
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })  // Send username instead of email
        });

        const result = await response.json();
        
        if (response.ok && result.token) {
          this.isLoggedIn = true;
          this.currentUser = result.admin;
          
          // Store token for future requests
          localStorage.setItem('admin_token', result.token);
          
          // Hide login modal/screen
          const loginModal = document.getElementById('loginModal');
          const loginScreen = document.getElementById('login-screen');
          
          if (loginModal) {
            loginModal.style.display = 'none';
          }
          if (loginScreen) {
            loginScreen.classList.add('hidden');
            document.getElementById('admin-panel').classList.remove('hidden');
          }
          
          // Load dashboard
          await this.loadDashboard();
          
          this.showNotification(`Welcome back, ${this.currentUser.name}!`, 'success');
        } else {
          throw new Error(result.error || 'Login failed');
        }
      } catch (error) {
        console.error('Login failed:', error);
        this.showNotification(error.message || 'Login failed. Please check your credentials.', 'error');
      } finally {
        this.setLoading(false);
      }
    };
    
    // console.log('✅ Login fix applied successfully');
  }
});