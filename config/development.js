module.exports = {
  database: {
    database: 'hoaxify',
    username: 'my-db_user',
    password: 'db-p4ss',
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
  },
  mail: {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'danielle.orn47@ethereal.email',
      pass: 'sVzD8T2aRbs9x4PNHR',
    },
  },
  uploadDir: 'uploads-dev',
  profileDir: 'profile',
};
