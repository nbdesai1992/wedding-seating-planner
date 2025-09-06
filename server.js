const express = require('express');
const path = require('path');

const app = express();
// Render uses PORT environment variable, defaults to 10000
const PORT = process.env.PORT || 10000;

// Serve static files from public directory
app.use(express.static('public'));

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Bind to 0.0.0.0 for Render compatibility
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the application locally`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});