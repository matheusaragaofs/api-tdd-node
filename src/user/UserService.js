const User = require('./User');
const bcrypt = require('bcrypt');
const EmailService = require('../email/EmailService')
const EmailException = require('../email/EmailException')
const InvalidTokenException = require('./InvalidTokenException')
const sequelize = require('../config/database')
const UserNotFoundExecption = require('./UserNotFoundException')
const NotFoundException = require('../error/NotFoundException')
const Sequelize = require('sequelize');
const { randomString } = require('../shared/generator');
const TokenService = require('../auth/TokenService');
const FileService = require('../file/FileService')

const save = async (body) => {
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, 10);
  const user = { username, email, password: hash, activationToken: randomString(60) }
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


const getUsers = async ({ page, size, authenticatedUser }) => {
  let pageSize = 10
  if (size) {
    pageSize = size
  }

  const usersWithCount = await User.findAndCountAll({
    limit: pageSize,
    offset: pageSize * page,
    attributes: ['id', 'username', 'email', 'image'],
    where: {
      inactive: false,
      id: {
        [Sequelize.Op.not]: authenticatedUser ? authenticatedUser.id : 0

      }
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

const getUserById = async ({ id }) => {
  const user = await User.findOne({ where: { id, inactive: false }, attributes: ['id', 'username', 'email', 'image'] })

  if (!user) {
    throw new UserNotFoundExecption()
  }

  return user
}

const updateUser = async (id, updatedBody) => {
  const imageFilename = await FileService.saveProfileImage(updatedBody?.image)

  try {
    await User.update({ ...updatedBody, image: imageFilename }, { where: { id } })
    const updatedUser = await getUserById({ id })
    return updatedUser
  } catch (error) {
    throw new UserNotFoundExecption()
  }

}

const deleteUser = async (id) => {
  await User.destroy({ where: { id } })
}

const passwordResetRequest = async (email) => {
  const user = await findByEmail(email)

  if (!user) {
    throw new NotFoundException('E-mail not found')
  }
  user.passwordResetToken = randomString(16)
  await user.save()

  try {
    await EmailService.sendPasswordReset(email, user.passwordResetToken)
  } catch (error) {
    throw new EmailException()
  }


}
const updatePassword = async (updateRequest) => {
  const user = await findByPasswordResetToken(updateRequest.passwordResetToken)
  const hash = await bcrypt.hash(updateRequest.password, 10);
  user.password = hash;
  user.passwordResetToken = null;
  user.inactive = false;
  user.activationToken = null
  await TokenService.clearTokens(user.id)
  await user.save();

}

const findByPasswordResetToken = async (token) => {
  return User.findOne({ where: { passwordResetToken: token } })
}
module.exports = { save, findByEmail, activate, getUsers, getUserById, updateUser, deleteUser, passwordResetRequest, updatePassword, findByPasswordResetToken };
