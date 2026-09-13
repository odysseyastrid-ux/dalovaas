const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Staff/owner login for the admin API — separate from the Supabase
// customer accounts used by account.html on the public site.
const AdminUser = sequelize.define('AdminUser', {
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'staff' },
}, {
  tableName: 'admin_users',
  underscored: true,
});

module.exports = AdminUser;
