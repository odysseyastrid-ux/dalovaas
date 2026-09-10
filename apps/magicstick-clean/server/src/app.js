const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api/services', servicesRoutes);

// Serve the adapted admin pages (index / login / dashboard) as static files.
app.use(express.static(path.join(__dirname, '..', 'public')));

module.exports = app;
