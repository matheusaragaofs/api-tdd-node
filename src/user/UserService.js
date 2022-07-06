const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const EmailService = require('../email/EmailService')
const EmailException = require('../email/EmailException')
const sequelize = require('../config/database')
const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length)

}
const save = async (body) => {
  const { username, email, password } = body;

  const hash = await bcrypt.hash(password, 10);

  const user = { username, email, password: hash, activationToken: generateToken(60) }

  const transaction = await sequelize.transaction()

  await User.create(user, { transaction });

  try {
    await EmailService.sendAccountActivation(email, user.activationToken)
    await transaction.commit()
  } catch (err) {
    await transaction.rollback()
    throw new EmailException()
  }

};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = { save, findByEmail };
