const express = require('express');

const UserService = require('./UserService');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const ValidationException = require('../error/ValidationException')
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

router.get('/api/1.0/users', async (req, res) => {
  const { page } = req.query
  let currentPage = page ? Number.parseInt(page) : 0
  if (currentPage < 0) currentPage = 0

  const users = await UserService.getUsers({ page: currentPage })
  res.send(users);
})
module.exports = router;
