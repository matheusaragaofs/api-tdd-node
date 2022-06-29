const app = require('./src/app');
const sequelize = require('./src/config/database');

sequelize.sync({ force: true });
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
app.listen(3000, () => console.log('app is running!'));
