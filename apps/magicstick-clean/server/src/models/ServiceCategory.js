const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Mirrors the two service groupings shown on the public site ("Residential"
// and "Commercial & specialty" in the Services section of index.html).
const ServiceCategory = sequelize.define('ServiceCategory', {
  name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
}, {
  tableName: 'service_categories',
  underscored: true,
  updatedAt: false,
});

module.exports = ServiceCategory;
