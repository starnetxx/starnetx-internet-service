with open('src/contexts/AuthContext.tsx', 'r') as f:
    content = f.read()

# Add setLoading(false) after successful profile fetch
old_text = "console.log('Profile set successfully');"
new_text = """console.log('Profile set successfully');
        setLoading(false);"""

content = content.replace(old_text, new_text)

with open('src/contexts/AuthContext.tsx', 'w') as f:
    f.write(content)

print("Fixed: Added setLoading(false) after profile set")
