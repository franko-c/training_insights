#!/usr/bin/env python3
"""
Zwift Authentication Session Manager - Refactored for API Client

Self-contained authentication module for ZwiftPower API access.
Handles login, session management, and token validation.

Usage:
    from zwift_api_client.auth import ZwiftAuthManager
    
    auth = ZwiftAuthManager()
    session = auth.get_session()
    response = session.get('https://zwiftpower.com/api3.php?do=something')
"""

import os
import time
import pickle
import logging
import requests
import json
import hashlib
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from getpass import getpass
from pathlib import Path
from dotenv import load_dotenv

class ZwiftAuthManager:
    """Manages authentication with Zwift services"""
    
    # Constants
    SESSION_EXPIRY = 21600  # 6 hours in seconds
    
    def __init__(self, email=None, password=None):
        """
        Initialize the authentication manager
        
        Args:
            email (str, optional): Zwift login email
            password (str, optional): Zwift login password
        """
        # Set up directories relative to this module - SELF-CONTAINED
        self.module_dir = Path(__file__).parent.parent.absolute()
        self.session_dir = self.module_dir / "auth" / ".sessions"
        self.config_dir = self.module_dir / "config"
        self.log_dir = self.module_dir / "logs"
        
        # Ensure directories exist
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Setup logging
        self._setup_logging()
        
        # Load credentials
        self.email, self.password = self._load_credentials(email, password)
        
        # Session management
        self.session = None
        self.session_file = None
        if self.email:
            self._set_session_file()
    
    def _setup_logging(self):
        """Setup logging for authentication"""
        log_file = self.log_dir / "zwift_api_auth.log"
        
        # Create logger
        self.logger = logging.getLogger("ZwiftApiAuth")
        self.logger.setLevel(logging.INFO)
        
        # Avoid adding handlers unless explicitly enabled via env var.
        # This prevents duplicate handlers when the module is imported by a larger app.
        enable_root_logging = os.getenv("ZWIFT_API_CLIENT_ENABLE_ROOT_LOGGING", "false").lower() in ("1", "true", "yes")
        if enable_root_logging and not self.logger.handlers:
            # File handler
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(logging.INFO)
            
            # Console handler
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.INFO)
            
            # Formatter
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            file_handler.setFormatter(formatter)
            console_handler.setFormatter(formatter)
            
            self.logger.addHandler(file_handler)
            self.logger.addHandler(console_handler)
    
    def _load_credentials(self, email=None, password=None):
        """Load credentials from environment or parameters"""
        
        # Try loading from .env file
        env_file = self.config_dir / ".env"
        if env_file.exists():
            load_dotenv(env_file)
            self.logger.info(f"Loaded environment from: {env_file}")
        
        # Get credentials (priority: parameters > environment)
        final_email = email or os.getenv("ZWIFT_EMAIL")
        final_password = password or os.getenv("ZWIFT_PASSWORD")
        
        if final_email:
            self.logger.info(f"ZWIFT_EMAIL loaded: {final_email}")
            if final_password:
                self.logger.info("ZWIFT_PASSWORD loaded: [MASKED]")
            else:
                self.logger.warning("ZWIFT_PASSWORD not found")
        else:
            self.logger.warning("ZWIFT_EMAIL not found")
        
        return final_email, final_password
    
    def _set_session_file(self):
        """Set the session file path based on email hash"""
        if not self.email:
            return
            
        # Create a hash of the email for the session filename
        email_hash = hashlib.md5(self.email.encode()).hexdigest()[:16]
        self.session_file = self.session_dir / f"zwift_session_{email_hash}.pickle"
    
    def get_session(self):
        """
        Get an authenticated session, creating one if needed
        
        Returns:
            requests.Session: Authenticated session ready for API calls
        """
        if not self.email or not self.password:
            raise Exception("Email and password are required for authentication")
        
        # Check if we have a valid cached session
        if self._load_cached_session():
            if self._validate_session():
                self.logger.info("Loaded cached session successfully")
                return self.session
            else:
                self.logger.info("Cached session is expired")
        
        # Need to login fresh
        if self._login():
            self._save_session()
            return self.session
        else:
            raise Exception("Failed to authenticate with ZwiftPower")
    
    def _load_cached_session(self):
        """Load session from cache if it exists"""
        if not self.session_file or not self.session_file.exists():
            return False
        
        try:
            with open(self.session_file, 'rb') as f:
                session_data = pickle.load(f)
            
            self.session = session_data['session']
            self.login_time = session_data['login_time']
            return True
            
        except Exception as e:
            self.logger.warning(f"Failed to load cached session: {e}")
            return False
    
    def _validate_session(self):
        """Check if the current session is still valid"""
        if not self.session or not hasattr(self, 'login_time'):
            return False
        
        # Check if session has expired
        age = time.time() - self.login_time
        if age > self.SESSION_EXPIRY:
            return False
        
        # Test with a simple API call
        try:
            response = self.session.get('https://zwiftpower.com/api3.php?do=status', timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def _login(self):
        """Handle the login process to ZwiftPower via Zwift authentication"""
        if not self.email or not self.password:
            self.logger.error("Email or password not provided")
            return False
            
        self.logger.info("Logging in to ZwiftPower...")
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        try:
            # First get the login page to extract login URL
            login_url = "https://zwiftpower.com/ucp.php?mode=login"
            response = self.session.get(login_url, timeout=30)
            response.raise_for_status()
            
            # Check if we're already logged in
            if ("Login Required" not in response.text and 
                "Login with Zwift" not in response.text and 
                "Sign in with Zwift" not in response.text):
                self.logger.info("Already logged in!")
                return True

            # Extract the login URL - try OAuth flow first
            login_soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for Zwift OAuth login link
            zwift_login_btn = None
            selectors = [
                'a.button[href*="id.zwift.com"]',
                'a[href*="id.zwift.com"]', 
                'a[href*="zwift.com/auth"]',
                'a.btn[href*="zwift"]',
                'a[href*="openid-connect"]'
            ]
            
            for selector in selectors:
                try:
                    zwift_login_btn = login_soup.select_one(selector)
                    if zwift_login_btn:
                        self.logger.debug(f"Found OAuth login with selector: {selector}")
                        break
                except Exception:
                    continue
                    
            if zwift_login_btn:
                # Use OAuth flow
                return self._oauth_login(zwift_login_btn['href'])
            else:
                # Fallback to direct form login
                return self._direct_login(login_soup)
                
        except Exception as e:
            self.logger.error(f"Login failed: {e}")
            return False
    
    def _oauth_login(self, zwift_login_url):
        """Handle OAuth login through Zwift"""
        try:
            if not zwift_login_url.startswith('http'):
                zwift_login_url = 'https://zwiftpower.com' + zwift_login_url
                
            self.logger.debug(f"Using OAuth URL: {zwift_login_url}")
            
            # Follow to Zwift authentication
            response = self.session.get(zwift_login_url, timeout=30)
            response.raise_for_status()
            
            # Parse Zwift login form
            zwift_soup = BeautifulSoup(response.text, 'html.parser')
            login_form = zwift_soup.find('form')
            
            if not login_form:
                self.logger.error("Could not find login form on Zwift page")
                return False
            
            # Extract form action
            form_action = login_form.get('action', '')
            if not form_action.startswith('http'):
                from urllib.parse import urljoin
                form_action = urljoin(response.url, form_action)
            
            # Build form data
            form_data = {}
            for input_tag in login_form.find_all('input'):
                name = input_tag.get('name')
                value = input_tag.get('value', '')
                input_type = input_tag.get('type', 'text').lower()
                
                if name:
                    if input_type == 'email' or name.lower() in ['email', 'username']:
                        form_data[name] = self.email
                    elif input_type == 'password' or name.lower() == 'password':
                        form_data[name] = self.password
                    else:
                        form_data[name] = value
            
            # Submit login form
            response = self.session.post(form_action, data=form_data, timeout=30, allow_redirects=True)
            response.raise_for_status()
            
            # Check success
            if 'zwiftpower.com' in response.url and 'error' not in response.url.lower():
                self.login_time = time.time()
                self.logger.info("OAuth login successful!")
                return True
            else:
                self.logger.error(f"OAuth login failed - redirected to: {response.url}")
                return False
                
        except Exception as e:
            self.logger.error(f"OAuth login error: {e}")
            return False
    
    def _direct_login(self, soup):
        """Handle direct form login"""
        try:
            form = soup.find('form', {'id': 'login'}) or soup.find('form')
            if not form:
                self.logger.error("Could not find login form")
                return False
            
            # Extract form data
            form_data = {}
            for input_tag in form.find_all('input'):
                name = input_tag.get('name')
                value = input_tag.get('value', '')
                if name:
                    form_data[name] = value
            
            # Set credentials
            form_data['username'] = self.email
            form_data['password'] = self.password
            form_data['login'] = 'Login'
            
            # Submit login
            login_submit_url = "https://zwiftpower.com/ucp.php?mode=login"
            response = self.session.post(login_submit_url, data=form_data, timeout=30)
            response.raise_for_status()
            
            # Check result
            if "Invalid username" in response.text or "Invalid password" in response.text:
                self.logger.error("Invalid credentials")
                return False
            
            if "ucp.php?mode=login" in response.url:
                self.logger.error("Direct login failed - still on login page")
                return False
            
            self.login_time = time.time()
            self.logger.info("Direct login successful!")
            return True
            
        except Exception as e:
            self.logger.error(f"Direct login error: {e}")
            return False
    
    def _save_session(self):
        """Save the current session to cache"""
        if not self.session or not self.session_file:
            return
        
        try:
            session_data = {
                'session': self.session,
                'login_time': self.login_time
            }
            
            with open(self.session_file, 'wb') as f:
                pickle.dump(session_data, f)
                
        except Exception as e:
            self.logger.warning(f"Failed to save session: {e}")
    
    def logout(self):
        """Logout and clear session"""
        if self.session_file and self.session_file.exists():
            try:
                self.session_file.unlink()
                self.logger.info("Session cache cleared")
            except Exception as e:
                self.logger.warning(f"Failed to clear session cache: {e}")
        
        self.session = None
        self.login_time = None
    
    def check_session_valid(self):
        """Check if current session is valid"""
        if not self.session:
            return False
        return self._validate_session()
    
    def session_age(self):
        """Get the age of the current session in seconds"""
        if not hasattr(self, 'login_time') or not self.login_time:
            return 0
        return time.time() - self.login_time


# Command line interface for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Zwift API Authentication Manager')
    parser.add_argument('-e', '--email', help='Zwift login email')
    parser.add_argument('-p', '--password', help='Zwift login password')
    parser.add_argument('-t', '--test', action='store_true', help='Test authentication')
    parser.add_argument('-l', '--logout', action='store_true', help='Logout and clear session')
    parser.add_argument('-c', '--check', action='store_true', help='Check session status')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose logging')
    
    args = parser.parse_args()
    
    auth_manager = ZwiftAuthManager(args.email, args.password)
    
    if args.verbose:
        auth_manager.logger.setLevel(logging.DEBUG)
    
    if args.logout:
        auth_manager.logout()
        print("Logged out and session cleared")
    elif args.check:
        if auth_manager.check_session_valid():
            age = auth_manager.session_age()
            hours = int(age / 3600)
            minutes = int((age % 3600) / 60)
            print(f"Session is valid (age: {hours}h {minutes}m)")
        else:
            print("Session is not valid or expired")
    elif args.test:
        try:
            session = auth_manager.get_session()
            print("✅ Authentication successful!")
            
            # Test API call
            response = session.get("https://zwiftpower.com/api3.php?do=league_list")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ API test successful - found {len(data.get('data', []))} leagues")
            else:
                print(f"❌ API test failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
    else:
        try:
            auth_manager.get_session()
            print("✅ Authentication successful! Session ready for API calls.")
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
