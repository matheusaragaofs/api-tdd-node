const app = require('./src/app');
const sequelize = require('./src/config/database');
const User = require('./src/user/User');
const bcrypt = require('bcrypt')
const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
    const hash = await bcrypt.hash('P4ssword', 10)
    for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
        await User.create({
            username: `user${i + 1}`,
            email: `user${i + 1}@email.com`,
            inactive: i >= activeUserCount,
            password: hash
        })
    }
}
sequelize.sync({ force: true }).then(async () => {
    await addUsers(25)
})
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
app.listen(3000, () => console.log('app is running!'));
