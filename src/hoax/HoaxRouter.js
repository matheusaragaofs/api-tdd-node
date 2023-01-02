const express = require('express');
const AuthenticationException = require('../auth/AuthenticationException');
const router = express.Router();
const HoaxService = require('./HoaxService');

router.post('/api/1.0/hoaxes', async (req, res, next) => {
  const hoax = req.body;
  const authenticatedUser = req.authenticatedUser;
  if (!authenticatedUser) {
    return next(new AuthenticationException(401, 'You are not authorized to post a Hoax'));
  }
  await HoaxService.save(hoax);
  res.send({ message: 'Hoax Saved' });
});

module.exports = router;
