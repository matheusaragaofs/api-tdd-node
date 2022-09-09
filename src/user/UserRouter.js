const express = require('express');
const pagination = require('../middleware/pagination')
const UserService = require('./UserService');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const ValidationException = require('../error/ValidationException');
const ForbiddenExecption = require('../error/ForbiddenExecption');

router.post(
  '/api/1.0/users',
  check('username')
    .notEmpty()
    .withMessage('Username cannot be null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('Must have min 4 and max 32 characters'),
  check('email')
    .notEmpty()
    .withMessage('E-mail cannot be null')
    .bail()
    .isEmail()
    .withMessage('E-mail is not valid')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findByEmail(email);
      if (user) {
        throw new Error('E-mail in use');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('Password cannot be null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('Password must have at least 1 uppercase, 1 lowercase letter and 1 number'),
  async (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()))
    }

    try {
      await UserService.save(req.body);
      return res.send({ message: 'User created' });

    } catch (error) {
      next(error)
    }
  }
);

router.post('/api/1.0/users/token/:token', async (req, res, next) => {

  try {
    const token = req.params.token
    await UserService.activate(token);
    return res.send({ message: 'Account activation succesfuly' })

  } catch (error) {
    next(error)
  }

})

router.get('/api/1.0/users', pagination, async (req, res) => {
  const authenticatedUser = req.authenticatedUser
  const { page, size } = req.pagination
  const users = await UserService.getUsers({ page, size, authenticatedUser })
  res.send(users);
})

router.get('/api/1.0/users/:id', async (req, res, next) => {
  const { id } = req.params
  try {
    const user = await UserService.getUserById({ id })
    res.send(user)
  } catch (err) {
    next(err)
  }

})

router.put('/api/1.0/users/:id', async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser

  if (!authenticatedUser || authenticatedUser.id != req.params.id) {
    return next(new ForbiddenExecption('You are not authorized to update user'))
  }
  await UserService.updateUser(req.params.id, req.body)
  return res.send()

})

router.delete('/api/1.0/users/:id', async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser
  if (!authenticatedUser || authenticatedUser.id != req.params.id) {
    return next(new ForbiddenExecption('You are not authorized to delete user'))
  }

  await UserService.deleteUser(req.params.id)
  res.send()
})

router.post('/api/1.0/user/password', check('email').isEmail().withMessage('E-mail is not valid'), async (req, res, next) => {
  const email = req.body.email

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new ValidationException(errors.array()))
  }

  try {
    await UserService.passwordResetRequest(email)
    res.send({ message: 'Check your e-mail for resetting your passsword' })
  } catch (error) {
    next(error)

  }
})

const passwordResetTokenValidator = async (req, res, next) => {
  const user = await UserService.findByPasswordResetToken(req.body.passwordResetToken)
  if (!user) {
    next(new ForbiddenExecption('Your are not authorized to update your password. Please follow the password steps again.'))
  }
  next()
}
router.put('/api/1.0/user/password',
  passwordResetTokenValidator,
  check('password')
    .notEmpty()
    .withMessage('Password cannot be null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('Password must have at least 1 uppercase, 1 lowercase letter and 1 number'),

  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()))
    }
    await UserService.updatePassword(req.body)
    res.send()
  })

module.exports = router;
