const express = require('express');

const UserService = require('./UserService');
const router = express.Router();

router.post('/api/1.0/users', async (req, res) => {
  const errors = {
    null: {
      username: 'Username can not be null'
    }
  }
  if (req.body.username === null) return res.status(400).send({validationErrors: errors.null.username}) 
  
  await UserService.save(req.body);
  
  return res.send({ message: 'User created' });
});

module.exports = router;
