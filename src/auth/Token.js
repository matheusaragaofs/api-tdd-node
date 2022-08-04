const Sequelize = require('sequelize');
const database = require('../config/database');


const Model = Sequelize.Model;


class Token extends Model { }

Token.init({
    token: {
        type: Sequelize.STRING
    },
    lastUsedAt: {
        type: Sequelize.DATE
    },
}, {
    sequelize: database,
    modelName: 'TOKEN',
    timestamps: false
})

module.exports = Token