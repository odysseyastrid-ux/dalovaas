const express = require('express');
const { Service, ServiceCategory, ActivityLog } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

const ALLOWED_STATUSES = ['active', 'inactive'];

// GET /api/services — public: list active services with their category.
router.get('/', asyncHandler(async (req, res) => {
  const services = await Service.findAll({
    where: { status: 'active' },
    include: [{ model: ServiceCategory, attributes: ['id', 'name'] }],
    order: [['id', 'ASC']],
  });
  res.json(services);
}));

// POST /api/services — admin only: create a service, and log the action.
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { title, description, price, status, categoryId } = req.body || {};

  if (typeof title !== 'string' || !title.trim() || title.length > 150) {
    return res.status(400).json({ error: 'title is required and must be 150 characters or fewer.' });
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 5000)) {
    return res.status(400).json({ error: 'description must be a string of 5000 characters or fewer.' });
  }
  if (price !== undefined && (typeof price !== 'number' || !Number.isFinite(price) || price < 0)) {
    return res.status(400).json({ error: 'price must be a non-negative number.' });
  }
  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}.` });
  }
  if (categoryId !== undefined && categoryId !== null) {
    const category = await ServiceCategory.findByPk(categoryId);
    if (!category) return res.status(400).json({ error: 'Unknown categoryId.' });
  }

  const service = await Service.create({
    title: title.trim(),
    description: description || '',
    price: price || 0,
    status: status || 'active',
    categoryId: categoryId || null,
    adminUserId: req.adminUser.id,
  });

  await ActivityLog.create({
    adminUserId: req.adminUser.id,
    action: 'CREATE_SERVICE',
    details: `Created service "${service.title}"`,
  });

  res.status(201).json(service);
}));

module.exports = router;
