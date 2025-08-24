#!/usr/bin/env python3
"""
Configuration Management

Handles configuration settings for the Zwift API client.
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, Any, Optional, List


class Config:
    """Configuration manager for Zwift API client"""
    
    def __init__(self, config_dir: str = None):
        """
        Initialize configuration
        
        Args:
            config_dir: Optional custom config directory
        """
        self.logger = logging.getLogger("ZwiftAPI.Config")
        
        # Set up config directory
        if config_dir:
            self.config_dir = Path(config_dir)
        else:
            self.config_dir = Path(__file__).parent
        
        self.config_file = self.config_dir / "config.json"
        
        # Default configuration
        self.defaults = {
            "api": {
                "base_url": "https://zwiftpower.com",
                "timeout": 30,
                "max_retries": 3,
                "retry_delay": 1.0,
                "rate_limit_delay": 1.0
            },
            "cache": {
                "enabled": True,
                "directory": str(self.config_dir / "cache"),
                "default_ttl": 3600,
                "max_size_mb": 100,
                "cleanup_interval": 3600
            },
            "logging": {
                "level": "INFO",
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "file": str(self.config_dir / "api_client.log"),
                "max_size_mb": 10,
                "backup_count": 5
            },
            "auth": {
                "session_timeout": 3600,
                "auto_refresh": True,
                "remember_session": True
            },
            "data": {
                "standard_intervals": [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600],
                "categories": ["A", "B", "C", "D"],
                "default_cache_ttl": {
                    "profile": 86400,
                    "power": 3600,
                    "rankings": 7200,
                    "races": 86400
                }
            }
        }
        
        # Load configuration
        self.config = self._load_config()
        
        # Setup logging
        self._setup_logging()
        
        self.logger.info("Configuration loaded")
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file or create with defaults"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    user_config = json.load(f)
                
                # Merge with defaults
                config = self._deep_merge(self.defaults, user_config)
                self.logger.info(f"Configuration loaded from {self.config_file}")
                return config
            else:
                # Create config file with defaults
                self._save_config(self.defaults)
                self.logger.info(f"Created default configuration at {self.config_file}")
                return self.defaults.copy()
        
        except Exception as e:
            self.logger.warning(f"Error loading config, using defaults: {e}")
            return self.defaults.copy()
    
    def _save_config(self, config: Dict[str, Any]) -> bool:
        """Save configuration to file"""
        try:
            # Ensure config directory exists
            self.config_dir.mkdir(parents=True, exist_ok=True)
            
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
            
            return True
        
        except Exception as e:
            self.logger.error(f"Error saving config: {e}")
            return False
    
    def _deep_merge(self, base: Dict, override: Dict) -> Dict:
        """Deep merge two dictionaries"""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def _setup_logging(self):
        """Setup logging based on configuration"""
        log_config = self.config.get("logging", {})
        
        # Create logs directory
        log_file = Path(log_config.get("file", "api_client.log"))
        log_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Setup root logger for this package
        logger = logging.getLogger("ZwiftAPI")
        logger.setLevel(getattr(logging, log_config.get("level", "INFO")))
        
        # Remove existing handlers
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        
        # Create formatter
        formatter = logging.Formatter(log_config.get("format", "%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
        
        # File handler with rotation
        from logging.handlers import RotatingFileHandler
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=log_config.get("max_size_mb", 10) * 1024 * 1024,
            backupCount=log_config.get("backup_count", 5)
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    
    def get(self, key_path: str, default: Any = None) -> Any:
        """
        Get configuration value using dot notation
        
        Args:
            key_path: Dot-separated path to config value (e.g., 'api.timeout')
            default: Default value if key not found
            
        Returns:
            Configuration value
        """
        try:
            value = self.config
            for key in key_path.split('.'):
                value = value[key]
            return value
        except (KeyError, TypeError):
            return default
    
    def set(self, key_path: str, value: Any, save: bool = False) -> bool:
        """
        Set configuration value using dot notation
        
        Args:
            key_path: Dot-separated path to config value
            value: Value to set
            save: Whether to save to file immediately
            
        Returns:
            True if successful
        """
        try:
            keys = key_path.split('.')
            target = self.config
            
            # Navigate to parent
            for key in keys[:-1]:
                if key not in target:
                    target[key] = {}
                target = target[key]
            
            # Set value
            target[keys[-1]] = value
            
            if save:
                return self._save_config(self.config)
            
            return True
        
        except Exception as e:
            self.logger.error(f"Error setting config value {key_path}: {e}")
            return False
    
    def update(self, updates: Dict[str, Any], save: bool = False) -> bool:
        """
        Update multiple configuration values
        
        Args:
            updates: Dictionary of key_path: value pairs
            save: Whether to save to file immediately
            
        Returns:
            True if successful
        """
        try:
            for key_path, value in updates.items():
                self.set(key_path, value, save=False)
            
            if save:
                return self._save_config(self.config)
            
            return True
        
        except Exception as e:
            self.logger.error(f"Error updating config: {e}")
            return False
    
    def save(self) -> bool:
        """Save current configuration to file"""
        return self._save_config(self.config)
    
    def reset_to_defaults(self, save: bool = False) -> bool:
        """
        Reset configuration to defaults
        
        Args:
            save: Whether to save to file immediately
            
        Returns:
            True if successful
        """
        self.config = self.defaults.copy()
        
        if save:
            return self._save_config(self.config)
        
        return True
    
    def get_credentials_path(self) -> Path:
        """Get path for storing credentials"""
        return self.config_dir / "credentials.json"
    
    def get_cache_dir(self) -> Path:
        """Get cache directory path"""
        cache_dir = Path(self.get("cache.directory", self.config_dir / "cache"))
        cache_dir.mkdir(parents=True, exist_ok=True)
        return cache_dir
    
    def get_logs_dir(self) -> Path:
        """Get logs directory path"""
        log_file = Path(self.get("logging.file", self.config_dir / "api_client.log"))
        return log_file.parent
    
    def export_config(self, file_path: str) -> bool:
        """
        Export current configuration to file
        
        Args:
            file_path: Path to export file
            
        Returns:
            True if successful
        """
        try:
            with open(file_path, 'w') as f:
                json.dump(self.config, f, indent=2)
            return True
        
        except Exception as e:
            self.logger.error(f"Error exporting config: {e}")
            return False
    
    def import_config(self, file_path: str, save: bool = False) -> bool:
        """
        Import configuration from file
        
        Args:
            file_path: Path to import file
            save: Whether to save after import
            
        Returns:
            True if successful
        """
        try:
            with open(file_path, 'r') as f:
                imported_config = json.load(f)
            
            # Merge with current config
            self.config = self._deep_merge(self.config, imported_config)
            
            if save:
                return self._save_config(self.config)
            
            return True
        
        except Exception as e:
            self.logger.error(f"Error importing config: {e}")
            return False
    
    def validate(self) -> List[str]:
        """
        Validate configuration
        
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        
        try:
            # Validate API settings
            if not self.get("api.base_url"):
                errors.append("API base URL is required")
            
            if self.get("api.timeout", 0) <= 0:
                errors.append("API timeout must be positive")
            
            # Validate cache settings
            cache_dir = self.get("cache.directory")
            if cache_dir:
                try:
                    Path(cache_dir).mkdir(parents=True, exist_ok=True)
                except Exception as e:
                    errors.append(f"Invalid cache directory: {e}")
            
            # Validate logging settings
            log_file = self.get("logging.file")
            if log_file:
                try:
                    Path(log_file).parent.mkdir(parents=True, exist_ok=True)
                except Exception as e:
                    errors.append(f"Invalid log file path: {e}")
        
        except Exception as e:
            errors.append(f"Configuration validation error: {e}")
        
        return errors
    
    def __str__(self) -> str:
        """String representation of configuration"""
        return json.dumps(self.config, indent=2)


# Global configuration instance
_config_instance = None


def get_config() -> Config:
    """Get global configuration instance"""
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()
    return _config_instance


def set_config(config: Config):
    """Set global configuration instance"""
    global _config_instance
    _config_instance = config
