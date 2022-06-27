const express = require('express');

const UserService = require('./UserService');
const router = express.Router()

const validateUsername = (req, res, next) => {
  if (req.body.username === null) {
    req.validationErrors = {
      username: 'Username can not be null'
    }
  }
  next()
}
const validateEmail = (req, res, next) => {
  if (req.body.email === null) {

    req.validationErrors = {
      ...req.validationErrors,
      email: 'E-mail can not be null'
    }
  }
  next()


}

router.post('/api/1.0/users', validateUsername, validateEmail, async (req, res) => {
  if (req.validationErrors) {
    const response = { validationErrors: { ...req.validationErrors } }
    return res.status(400).send(response)
  }
  await UserService.save(req.body);
  return res.send({ message: 'User created' });
});

module.exports = router;
