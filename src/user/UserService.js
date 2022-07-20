const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const EmailService = require('../email/EmailService')
const EmailException = require('../email/EmailException')
const InvalidTokenException = require('./InvalidTokenException')
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


const activate = async (token) => {


  const user = await User.findOne({
    where: {
      activationToken: token
    }
  })

  if (!user) {
    throw new InvalidTokenException()
  }

  user.activationToken = null
  user.inactive = false;
  await user.save();

}


const getUsers = async ({ page, size }) => {
  let pageSize = 10
  if (size) {
    pageSize = size
  }

  const usersWithCount = await User.findAndCountAll({
    limit: pageSize,
    offset: pageSize * page,
    attributes: ['id', 'username', 'email'],
    where: {
      inactive: false
    },

  })



  const totalPages = Math.ceil(usersWithCount.count / pageSize)
  return {
    content: usersWithCount.rows,
    page,
    size: pageSize,
    totalPages
  }
}
module.exports = { save, findByEmail, activate, getUsers };
