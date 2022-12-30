
module.exports = {
  "database": {
    "databaseName": "hoaxify",
    "username": "my-db_user",
    "password": "db-p4ss",
    "dialect": "sqlite",
    "storage": "./staging.sqlite",
    "logging": false
  },
  "mail": {
    "host": "localhost",
    "port": Math.floor(Math.random() * 2000) + 10000,
    "tls": {
      "rejectUnauthorized": false
    }
  },
  uploadDir: 'uploads-staging',
  profileDir: 'profile'
}