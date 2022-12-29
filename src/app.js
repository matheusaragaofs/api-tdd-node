const express = require('express');
const UserRouter = require('./user/UserRouter');
const ErrorHandler = require('./error/ErrorHandler')
const AuthenticationRouter = require('./auth/AuthenticationRouter')
const tokenAuthentication = require('./middleware/tokenAuthentication')
const config = require('config')
const path = require('path')

const ONE_YEAR_IN_MILLIS = 365 * 24 * 60 * 60 * 1000

const { uploadDir, profileDir } = config
const profileFolder = path.join('.', uploadDir, profileDir)

const FileService = require('./file/FileService')

FileService.createFolders()

const app = express();
app.use(express.json({ limit: '3mb' }));

app.use('/images', express.static(profileFolder, { maxAge: ONE_YEAR_IN_MILLIS })) //default behaviour of express, it will be converted to seconds in the headers

app.use(tokenAuthentication)
app.use(UserRouter);
app.use(AuthenticationRouter)
app.use(ErrorHandler)

module.exports = app;
