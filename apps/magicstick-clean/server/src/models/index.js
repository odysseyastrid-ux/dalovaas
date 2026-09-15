const sequelize = require('../config/database');
const AdminUser = require('./AdminUser');
const ServiceCategory = require('./ServiceCategory');
const Service = require('./Service');
const ActivityLog = require('./ActivityLog');

ServiceCategory.hasMany(Service, { foreignKey: 'categoryId', onDelete: 'SET NULL' });
Service.belongsTo(ServiceCategory, { foreignKey: 'categoryId' });

AdminUser.hasMany(Service, { foreignKey: 'adminUserId', onDelete: 'CASCADE' });
Service.belongsTo(AdminUser, { foreignKey: 'adminUserId' });

AdminUser.hasMany(ActivityLog, { foreignKey: 'adminUserId', onDelete: 'SET NULL' });
ActivityLog.belongsTo(AdminUser, { foreignKey: 'adminUserId' });

module.exports = { sequelize, AdminUser, ServiceCategory, Service, ActivityLog };
