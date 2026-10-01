require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 3001;

sequelize.authenticate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Magicstick Clean admin API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Could not connect to the database:', err.message);
    process.exit(1);
  });
