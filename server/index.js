require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const propertiesRoutes = require('./routes/properties');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const restRoutes = require('./routes/rest');
const uploadRoutes = require('./routes/upload');
const edgeRoutes = require('./routes/edge');
const chatRoutes = require('./routes/chat');
const contactRoutes = require('./routes/contact');
const razorpayRoutes = require('./routes/razorpay');
const paymentsRoutes = require('./routes/payments');

app.use(cors());
// Mount Razorpay webhook receiver before global JSON body parsing
app.use('/api/razorpay', razorpayRoutes);

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/rest', restRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/edge', edgeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payments', paymentsRoutes);

// Root test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SQLite Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
