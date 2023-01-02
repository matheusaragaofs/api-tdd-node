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
    modelName: 'hoax',
    timestamps: false,
  }
);

module.exports = Hoax;
