// Simple encryption for storing sensitive data
// Note: This is basic obfuscation, not true encryption
// For production, consider using Web Crypto API or a proper encryption library

const STORAGE_KEY = 'starnetx_auth_data';

// Simple XOR cipher for basic obfuscation
const obfuscate = (text: string): string => {
  const key = 'StarNetX2024SecureKey';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result); // Base64 encode
};

const deobfuscate = (encoded: string): string => {
  try {
    const key = 'StarNetX2024SecureKey';
    const text = atob(encoded); // Base64 decode
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return '';
  }
};

export const secureStorage = {
  saveCredentials: (email: string, password: string, rememberMe: boolean) => {
    if (rememberMe) {
      const data = {
        email,
        password: obfuscate(password),
        rememberMe: true,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  getCredentials: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      
      // Check if credentials are older than 30 days
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - data.timestamp > thirtyDays) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      return {
        email: data.email,
        password: deobfuscate(data.password),
        rememberMe: data.rememberMe
      };
    } catch {
      return null;
    }
  },

  clearCredentials: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};