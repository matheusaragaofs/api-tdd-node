const Sequelize = require('sequelize');
const database = require('../config/database');
const FileAttachment = require('../file/FileAttachment');

const { Model, STRING, BIGINT } = Sequelize;
class Hoax extends Model { }

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
Hoax.hasOne(FileAttachment, { foreignKey: 'hoaxId' });
FileAttachment.belongsTo(Hoax);

module.exports = Hoax;
