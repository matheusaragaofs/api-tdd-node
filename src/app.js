const express = require('express');
const UserRouter = require('./user/UserRouter');
const ErrorHandler = require('./error/ErrorHandler')
const AuthenticationRouter = require('./auth/AuthenticationRouter')
const tokenAuthentication = require('./middleware/tokenAuthentication')
const app = express();
app.use(express.json());

app.use(tokenAuthentication)
app.use(UserRouter);
app.use(AuthenticationRouter)
app.use(ErrorHandler)

module.exports = app;
