# Project Guidelines for Claude

## Testing Policy

- **NO LOCAL TESTING**: Do not run `npm start` or test the application locally
- **DEPLOYMENT TESTING ONLY**: All testing is done by pushing to Render and testing on the deployed service
- **USER FEEDBACK**: The user will report back with results from the Render deployment

## Project Structure

- Simple Express server serving static files
- Frontend uses localStorage for data persistence (no database)
- All functionality is client-side JavaScript

## Deployment

- Platform: Render Web Service
- Port: Uses PORT environment variable (Render default: 10000)
- Host: Must bind to 0.0.0.0 for Render compatibility
- Build Command: `npm install`
- Start Command: `npm start`

## Important Notes

- No Firebase or external database dependencies
- All UI/UX must remain unchanged from original
- Data persistence via browser localStorage only