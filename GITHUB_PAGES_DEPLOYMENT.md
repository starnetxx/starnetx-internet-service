# GitHub Pages Deployment Guide for StarNetX

## Prerequisites
- GitHub repository (already set up: `starnetx-internet-service`)
- Node.js and npm installed
- gh-pages package (already installed)

## Step 1: Update Vite Configuration

Edit your `vite.config.ts` file and change the `base` property:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/starnetx-internet-service/',  // <- Change this line from '/' to your repo name
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    host: true
  }
});
```

## Step 2: Update package.json Scripts

Add these deployment scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

## Step 3: Deploy to GitHub Pages

### Option A: Manual Deployment (Recommended for First Time)

1. Build your project:
```bash
npm run build
```

2. Deploy to GitHub Pages:
```bash
npm run deploy
```

This will:
- Create a `gh-pages` branch in your repository
- Upload the built files to that branch
- Configure GitHub Pages to serve from that branch

### Option B: Automatic Deployment with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
          
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## Step 4: Configure GitHub Repository

1. Go to your GitHub repository: https://github.com/binahinnovation/starnetx-internet-service

2. Navigate to **Settings** > **Pages**

3. Under "Source", select:
   - **Deploy from a branch**
   - Branch: `gh-pages`
   - Folder: `/ (root)`

4. Click **Save**

## Step 5: Add Environment Variables (for GitHub Actions)

If using GitHub Actions:

1. Go to **Settings** > **Secrets and variables** > **Actions**

2. Add these repository secrets:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

## Step 6: Important Considerations

### Environment Variables
Since GitHub Pages serves static files, environment variables are baked in at build time. Make sure your Supabase keys are the public anon keys (safe to expose).

### CORS Configuration
Ensure your Supabase project allows requests from your GitHub Pages domain:
- `https://binahinnovation.github.io`

Add this to your Supabase project's allowed origins.

### Custom Domain (Optional)
If you have a custom domain:
1. Create a `CNAME` file in your `public` folder with your domain
2. Configure DNS settings to point to GitHub Pages

## Step 7: Verify Deployment

After deployment, your app will be available at:
```
https://binahinnovation.github.io/starnetx-internet-service/
```

## Troubleshooting

### 404 Errors on Refresh
Since this is a SPA, add a `404.html` in your `public` folder:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>StarNetX</title>
    <script type="text/javascript">
      var pathSegmentsToKeep = 1;
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body>
  </body>
</html>
```

### Assets Not Loading
Make sure all asset paths in your code use relative paths or are prefixed with the base path.

### Build Failures
Check that all dependencies are listed in `package.json` (not just devDependencies).

## Commands Summary

```bash
# First time setup
npm install --save-dev gh-pages

# Build and deploy
npm run build
npm run deploy

# Or in one command
npm run predeploy && npm run deploy
```

## Next Steps

1. Edit `vite.config.ts` to set the base path
2. Run `npm run deploy`
3. Check GitHub Pages settings
4. Visit your deployed site

Your app should be live within a few minutes!