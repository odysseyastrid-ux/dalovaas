const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// The cleaning services shown in index.html's "What I offer" section.
// price = 0.00 for custom-quote-only services (Move-In/Move-Out, Office,
// Retail, Post-Construction) — the public site never shows a fixed price
// for those either.
const Service = sequelize.define('Service', {
  title: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.0 },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
}, {
  tableName: 'services',
  underscored: true,
});

module.exports = Service;
