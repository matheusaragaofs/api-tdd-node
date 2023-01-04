const sequelize = require('./src/config/database')

beforeAll(async () => {
    if (process.env.NODE_ENV === 'test') {
        //our database should initialize the database with migrations
        //that running the test in memory, so we have to sync, cause has no migrations
        await sequelize.sync();
    }
})