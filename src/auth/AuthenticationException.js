module.exports = function AuthenticationException(status = 401, message = 'Incorrect Credentials') {
  this.status = status;
  this.message = message;
};
