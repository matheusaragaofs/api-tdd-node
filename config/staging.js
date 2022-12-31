module.exports = {
  database: {
    database: 'hoaxify',
    username: 'postgres',
    password: 'postgres',
    host: 'localhost',
    dialect: 'postgres',
  },
  mail: {
    host: 'localhost',
    port: Math.floor(Math.random() * 2000) + 10000,
    tls: {
      rejectUnauthorized: false,
    },
  },
  uploadDir: 'uploads-staging',
  profileDir: 'profile',
};
