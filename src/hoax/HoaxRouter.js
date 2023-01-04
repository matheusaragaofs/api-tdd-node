const express = require('express');
const AuthenticationException = require('../auth/AuthenticationException');
const router = express.Router();
const HoaxService = require('./HoaxService');
const { check, validationResult } = require('express-validator');
const ValidationException = require('../error/ValidationException');
const pagination = require('../middleware/pagination');
const ForbiddenExecption = require('../error/ForbiddenExecption');

router.post(
  '/api/1.0/hoaxes',
  check('content').isLength({ min: 10, max: 5000 }).withMessage('Hoax must be min 10 and max 5000 characters'),
  async (req, res, next) => {
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUser) {
      return next(new AuthenticationException(401, 'You are not authorized to post a Hoax'));
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    const hoax = req.body;
    await HoaxService.save(hoax, authenticatedUser);
    res.send({ message: 'Hoax Saved' });
  }
);

router.get(['/api/1.0/hoaxes', '/api/1.0/users/:userId/hoaxes'], pagination, async (req, res, next) => {
  const { page, size } = req.pagination;
  try {
    const hoaxes = await HoaxService.getHoaxes({ page, size, userId: req.params.userId });
    res.send(hoaxes);
  } catch (err) {
    next(err);
  }
});

router.delete('/api/1.0/hoaxes/:hoaxId', async (req, res, next) => {
  const id = req.params.hoaxId
  const authenticatedUser = req.authenticatedUser
  if (!authenticatedUser) {
    return next(new ForbiddenExecption('You are not authorized to delete this hoax'))
  }

  try {
    await HoaxService.deleteHoax({ id, userId: authenticatedUser.id })
    res.send()

  } catch (error) {
    next(error)

  }

})

module.exports = router;
