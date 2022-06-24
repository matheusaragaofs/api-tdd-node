const Sequelize = require('sequelize');

const databaseName = 'hoaxify';
const userName = 'my-db_user';
const dbPassword = 'db-p4ss';

const sequelize = new Sequelize(databaseName, userName, dbPassword, {
  dialect: 'sqlite',
  storage: './database.sqlite',
});

module.exports = sequelize;
