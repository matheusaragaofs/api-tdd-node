const express = require('express');

const UserService = require('./UserService');
const router = express.Router()
const { check, validationResult } = require('express-validator')

router.post('/api/1.0/users',
  check('username').notEmpty().withMessage('Username can not be null'),
  check('email').notEmpty().withMessage('E-mail can not be null'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const validationErrors = {
      }
      errors.array().forEach(error => {
        return validationErrors[error.param] = error.msg
      })
      return res.status(400).send({ validationErrors })
    }
    await UserService.save(req.body);
    return res.send({ message: 'User created' });
  });

module.exports = router;
