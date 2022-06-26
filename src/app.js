const express = require('express');
const User = require('./user/User');
const bcrypt = require('bcrypt');

const app = express();

app.use(express.json());

app.post('/api/1.0/users', (req, res) => {
  bcrypt.hash(req.body.password, 10).then((hash) => {
    const user = Object.assign({}, req.body, { password: hash });
    // is the same as {...req.body , password: hash}
    console.log('user:', user);
    User.create(user).then(() => {
      return res.send({
        message: 'User created',
      });
    });
  });
});

module.exports = app;
