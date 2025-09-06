# Wedding Seating Chart Planner

A sophisticated wedding seating chart planner web application that allows event organizers to design interactive layouts with drag-and-drop functionality, manage guests, and create various table arrangements. All data is stored locally in your browser for privacy and simplicity.

## Features

- **Interactive Seating Chart Designer**: Drag-and-drop interface for arranging tables and features
- **Multiple Table Types**: Rectangle, circle, half-moon/sweetheart tables
- **Special Elements**: Bar areas, cake tables, dance floors, and other room features
- **Guest Management**: Add, remove, and seat guests with drag-and-drop assignment
- **Table Customization**: Resize, rotate, and edit table properties
- **Zoom & Pan Controls**: Navigate large layouts easily
- **Local Storage**: All data saved locally in your browser
- **Save/Load/Clear Functions**: Manage your layouts with simple controls

## Quick Start

### Prerequisites

- **Node.js**: Version 14.0.0 or higher
- **npm**: Comes with Node.js

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd wedding-seating-planner
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open your browser**:
   Navigate to `http://localhost:10000`

## Deploy to Render

### Method 1: Deploy with Render Button (Quickest)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Method 2: Manual Deployment via Dashboard

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create a Render account**:
   - Go to [render.com](https://render.com)
   - Sign up for a free account

3. **Create a new Web Service**:
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub account if not already connected
   - Select your `wedding-seating-planner` repository

4. **Configure your service**:
   
   | Setting | Value |
   |---------|-------|
   | **Name** | `wedding-seating-planner` (or your choice) |
   | **Region** | Choose closest to your users |
   | **Branch** | `main` |
   | **Root Directory** | Leave blank |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | `Free` |

5. **Advanced Settings** (optional):
   - Health Check Path: `/health`
   - Environment Variables: None required (PORT is auto-configured)

6. **Click "Create Web Service"**

7. **Wait for deployment** (2-3 minutes)
   - Render will build and deploy your application
   - You'll see logs in real-time
   - Once complete, your app will be live!

8. **Access your application**:
   - URL: `https://wedding-seating-planner.onrender.com` (or your chosen name)
   - The URL will be shown in your Render dashboard

### Method 3: Deploy with render.yaml (Infrastructure as Code)

1. **Update render.yaml**:
   - Edit the `repo` field in `render.yaml` with your GitHub repository URL

2. **Push to GitHub**:
   ```bash
   git add render.yaml
   git commit -m "Add Render configuration"
   git push origin main
   ```

3. **In Render Dashboard**:
   - Click **"New +"** → **"Blueprint"**
   - Connect your repository
   - Render will automatically detect `render.yaml`
   - Click **"Apply"** to create resources

### Custom Domain Setup (Optional)

1. In your Render service dashboard:
   - Go to **Settings** → **Custom Domains**
   - Click **"Add Custom Domain"**
   - Enter your domain (e.g., `seating.yourwedding.com`)

2. Configure DNS:
   - Add the provided CNAME record to your DNS provider
   - Wait for DNS propagation (5-30 minutes)
   - Render will auto-provision SSL certificate

## Usage Guide

### Creating Your Seating Chart

1. **Adding Tables**:
   - Click table type buttons in the left panel
   - Enter table name and capacity
   - Tables appear in the main area

2. **Managing Guests**:
   - Type guest name in the input field
   - Click "Add" to add to guest list
   - Drag guests from the list to seats

3. **Table Manipulation**:
   - **Move**: Click and drag the table
   - **Resize**: Drag the corner handle (blue dot)
   - **Rotate**: Drag the top handle (purple dot)
   - **Edit**: Double-click to edit properties
   - **Copy**: Click the copy button
   - **Delete**: Click the X button

4. **Navigation**:
   - **Pan**: Click and drag on empty space
   - **Zoom**: Use zoom controls or scroll wheel
   - **Reset View**: Click "Reset" button

5. **Data Management**:
   - **Save Layout**: Saves to browser's local storage
   - **Load Layout**: Loads previously saved layout
   - **Clear All**: Removes all tables and guests

## Render Deployment Notes

### Free Tier Limitations

- **Spin down**: Service spins down after 15 minutes of inactivity
- **Spin up**: Takes ~30 seconds to restart when accessed
- **Monthly limits**: 750 hours of running time
- **Perfect for**: Personal projects, wedding planning

### Upgrading (if needed)

For always-on service without spin-downs:
1. Go to your service dashboard
2. Click **"Upgrade"** 
3. Select a paid instance type ($7/month starter)

### Monitoring

- **Logs**: View real-time logs in Render dashboard
- **Metrics**: Monitor CPU, memory, and request metrics
- **Health Check**: Endpoint at `/health` for monitoring

## Technical Details

### Architecture

```
wedding-seating-planner/
├── server.js           # Express server (Render-optimized)
├── package.json        # Dependencies and scripts
├── public/
│   └── index.html     # Main application
├── render.yaml        # Render deployment config
├── .env.example       # Environment template
└── README.md          # This file
```

### Technology Stack

- **Frontend**: Vanilla JavaScript, Tailwind CSS (via CDN)
- **Backend**: Express.js (minimal server)
- **Storage**: Browser LocalStorage
- **Hosting**: Render Web Service
- **Port**: Configurable via PORT env var (default: 10000)

## Troubleshooting

### Render-Specific Issues

1. **Build Failures**:
   - Check build logs in Render dashboard
   - Ensure `package.json` is valid
   - Verify Node version compatibility

2. **Service Won't Start**:
   - Check start command is `npm start`
   - Verify PORT binding (handled automatically)
   - Review logs for error messages

3. **Slow Initial Load**:
   - Normal for free tier (cold start)
   - Upgrade to paid tier for always-on service

4. **Custom Domain Not Working**:
   - Verify DNS records are correct
   - Wait for propagation (up to 48 hours)
   - Check SSL certificate status in dashboard

### Local Development Issues

1. **Port Already in Use**:
   ```bash
   # Kill process on port 10000
   lsof -ti:10000 | xargs kill -9
   ```

2. **Module Not Found**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## Browser Compatibility

Works best with modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers supported

## Data Persistence

- **LocalStorage**: Data persists in browser
- **Per-Browser**: Each browser maintains separate data
- **Export/Import**: Manual save/load functionality
- **No Cloud Sync**: Data stays on device for privacy

## Security & Privacy

- **No External Database**: All data stored locally
- **No User Tracking**: No analytics or telemetry
- **No Authentication Required**: Completely anonymous
- **HTTPS**: Automatically enabled on Render
- **Data Control**: Users have full control

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## Future Enhancements

- [ ] Export to PDF/Image
- [ ] Import/Export JSON data
- [ ] Multiple floor plans
- [ ] Guest meal preferences
- [ ] Table assignment suggestions
- [ ] Print-friendly view

## Support

- **Render Status**: [status.render.com](https://status.render.com)
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Issues**: Open an issue on GitHub
- **Community**: Render Community Forum

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Express.js](https://expressjs.com/) for serving
- [Render](https://render.com/) for hosting