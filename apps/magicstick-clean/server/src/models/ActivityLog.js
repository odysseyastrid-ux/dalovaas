const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
  action: { type: DataTypes.STRING(100), allowNull: false },
  details: { type: DataTypes.TEXT },
}, {
  tableName: 'activity_logs',
  underscored: true,
  updatedAt: false,
});

module.exports = ActivityLog;
