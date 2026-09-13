const express = require('express');
const { Service, ServiceCategory, ActivityLog } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/services — public: list active services with their category.
router.get('/', async (req, res) => {
  const services = await Service.findAll({
    where: { status: 'active' },
    include: [{ model: ServiceCategory, attributes: ['id', 'name'] }],
    order: [['id', 'ASC']],
  });
  res.json(services);
});

// POST /api/services — admin only: create a service, and log the action.
router.post('/', requireAuth, async (req, res) => {
  const { title, description, price, status, categoryId } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required.' });

  const service = await Service.create({
    title,
    description: description || '',
    price: price || 0,
    status: status || 'active',
    categoryId: categoryId || null,
    adminUserId: req.adminUser.id,
  });

  await ActivityLog.create({
    adminUserId: req.adminUser.id,
    action: 'CREATE_SERVICE',
    details: `Created service "${title}"`,
  });

  res.status(201).json(service);
});

module.exports = router;
