# Fix WebSocket Connection Errors After Deployment

## Problem
WebSocket connections fail in production because the frontend tries to connect to `localhost:5000`, which is not accessible from deployed environments.

## Root Cause
- `VITE_WS_URL` environment variable is not set in production deployments.
- Backend CORS is hardcoded to specific Vercel URLs, not configurable.

## Changes Made
- ✅ Updated backend to use `CORS_ORIGINS` env var for configurable CORS.
- ✅ Added `VITE_WS_URL` to frontend env example.
- ✅ Updated deployment configs with placeholder `VITE_WS_URL`.

## Next Steps
1. **Determine your backend production URL** (e.g., `https://your-backend.onrender.com`).
2. **Set CORS_ORIGINS in backend deployment** to allow your frontend URL(s), e.g., `https://your-frontend.onrender.com`.
3. **Replace placeholder URLs in deployment configs**:
   - In `vercel.json`: Change `"https://your-backend-url.onrender.com"` to your actual backend URL.
   - In `netlify.toml`: Change `"https://your-backend-url.onrender.com"` to your actual backend URL.
   - In `render.yaml`: Change `https://your-backend-url.onrender.com` to your actual backend URL.
4. **Redeploy frontend and backend** with the updated configurations.
5. **Test the WebSocket connection** in production.

## Environment Variables Summary
### Frontend (.env)
- `VITE_WS_URL`: Backend base URL (e.g., `https://my-backend.onrender.com`)

### Backend (.env)
- `CORS_ORIGINS`: Comma-separated list of allowed frontend URLs (e.g., `https://my-frontend.vercel.app,https://my-frontend.onrender.com`)
