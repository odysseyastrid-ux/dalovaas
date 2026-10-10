require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, AdminUser, ServiceCategory, Service } = require('./models');

async function seed() {
  await sequelize.sync();

  const [residential] = await ServiceCategory.findOrCreate({
    where: { name: 'Residential' },
    defaults: { description: 'Standard, deep, move-in/move-out, and Airbnb turnover cleaning for homes.' },
  });
  const [commercial] = await ServiceCategory.findOrCreate({
    where: { name: 'Commercial & specialty' },
    defaults: { description: 'Office, retail, and post-construction/event cleanup.' },
  });

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [owner] = await AdminUser.findOrCreate({
    where: { email },
    defaults: { username: 'owner', passwordHash, role: 'owner' },
  });

  // The real services and prices shown on index.html's "What I offer" section.
  const services = [
    { title: 'Standard Cleaning', description: 'Regular maintenance for kitchens, bathrooms, floors, and dusting.', price: 130, categoryId: residential.id },
    { title: 'Deep Cleaning', description: 'A full top-to-bottom reset: appliances, baseboards, cabinets, windows, and everything in between.', price: 180, categoryId: residential.id },
    { title: 'Move-In / Move-Out', description: 'A fresh start for your next chapter, with every room cleaned before the keys change hands.', price: 0, categoryId: residential.id },
    { title: 'Airbnb & Short-Term Rental Turnovers', description: 'Guest-ready resets between bookings: beds remade, bathrooms reset, restocked, and staged.', price: 100, categoryId: residential.id },
    { title: 'Office Cleaning', description: 'Recurring cleaning scheduled around your business hours, not the other way around.', price: 0, categoryId: commercial.id },
    { title: 'Retail & Store Cleaning', description: 'Floors, fixtures, and front-of-store upkeep that keeps a shop guest-ready.', price: 0, categoryId: commercial.id },
    { title: 'Post-Construction & Event Cleanup', description: 'Dust and debris after a reno, or a fast reset after a hall rental or event.', price: 0, categoryId: commercial.id },
  ];

  for (const svc of services) {
    await Service.findOrCreate({
      where: { title: svc.title },
      defaults: { ...svc, adminUserId: owner.id },
    });
  }

  console.log(`Seeded ${services.length} services, 2 categories, and admin login ${email}.`);
  await sequelize.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
