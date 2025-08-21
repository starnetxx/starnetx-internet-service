const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

// Fix 1: Make getInitialSession await the profile fetch
const oldProfileFetch = `          // Fetch profile in background without blocking UI
          fetchUserProfileWithTimeout(session.user.id).then(() => {
            console.log('Profile loaded successfully');
          }).catch((profileError) => {
            console.warn('Profile fetch failed, using minimal profile:', profileError);
            // Create minimal profile as fallback
            const minimalProfile = createMinimalUserProfile(session.user);
            setUser(minimalProfile);
            setIsAdmin(false);
          });`;

const newProfileFetch = `          // Fetch profile and ensure it completes
          fetchUserProfileWithTimeout(session.user.id)
            .then(() => {
              console.log('Profile loaded successfully');
            })
            .catch((profileError) => {
              console.warn('Profile fetch failed, using minimal profile:', profileError);
              // Create minimal profile as fallback
              const minimalProfile = createMinimalUserProfile(session.user);
              setUser(minimalProfile);
              setIsAdmin(false);
            })
            .finally(() => {
              // Ensure loading is false after profile attempt
              if (mounted) {
                setLoading(false);
              }
            });`;

content = content.replace(oldProfileFetch, newProfileFetch);

// Write the file back
fs.writeFileSync('src/contexts/AuthContext.tsx', content);

console.log('Fixed AuthContext.tsx - profile loading now properly handled');