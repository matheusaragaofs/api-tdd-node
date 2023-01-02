const express = require('express');
const AuthenticationException = require('../auth/AuthenticationException');
const router = express.Router();

router.post('/api/1.0/hoaxes', async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser;
  if (!authenticatedUser) {
    return next(new AuthenticationException(401, 'You are not authorized to post a Hoax'));
  }
  res.send(200);
});

module.exports = router;
