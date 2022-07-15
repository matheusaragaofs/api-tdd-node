const express = require('express');
const UserRouter = require('./user/UserRouter');
const ErrorHandler = require('./error/ErrorHandler')
const app = express();
app.use(express.json());

app.use(UserRouter);
app.use(ErrorHandler)

module.exports = app;
