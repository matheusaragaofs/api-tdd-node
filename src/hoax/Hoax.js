const Sequelize = require('sequelize');
const database = require('../config/database');

const { Model, STRING, BIGINT } = Sequelize;
class Hoax extends Model {}

Hoax.init(
  {
    content: {
      type: STRING,
    },
    timestamp: {
      type: BIGINT,
    },
  },
  {
    sequelize: database,
    modelName: 'hoaxes',
    timestamps: false,
  }
);

module.exports = Hoax;
