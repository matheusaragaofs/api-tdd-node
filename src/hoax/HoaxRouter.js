const express = require('express');
const AuthenticationException = require('../auth/AuthenticationException');
const router = express.Router();
const HoaxService = require('./HoaxService');
const { check, validationResult } = require('express-validator');
const ValidationException = require('../error/ValidationException');
const pagination = require('../middleware/pagination');
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

router.get('/api/1.0/hoaxes', pagination, async (req, res, next) => {
  const { page, size } = req.pagination;
  const hoaxes = await HoaxService.getHoaxes({ page, size });
  res.send(hoaxes);
});
module.exports = router;
