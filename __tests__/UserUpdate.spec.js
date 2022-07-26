const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
beforeAll(async () => {
    await sequelize.sync()
})
beforeEach(async () => {
    await User.destroy({ truncate: true })
})

const activeUser = { username: 'user1', email: 'user1@email.com', password: 'P4ssword', inactive: false }
const addUser = async (user = { ...activeUser }) => {
    const hash = await bcrypt.hash(user.password, 10)
    user.password = hash;
    return await User.create(user)
}

const putUser = (id = 5, body = null, options = {}) => {
    const agent = request(app).put('/api/1.0/users/' + id)
    if (options.auth) {
        const { email, password } = options.auth
        // const merged = `${email}:${password}`
        // const base64 = Buffer.from(merged).toString('base64')
        // agent.set('Authorization', `Basic ${base64}`)
        agent.auth(email, password)
    }
    return agent.send(body)
}
describe('User Update', () => {
    it('returns forbidden when request sent without basic authorization', async () => {
        const response = await putUser()
        expect(response.status).toBe(403)
    })

    it('returns error body with message for unauthorized request', async () => {
        const nowInMillis = new Date().getTime()
        const response = await putUser()
        expect(response.body.message).toBe('You are not authorized to update user')
        expect(response.body.path).toBe('/api/1.0/users/5')
        expect(response.body.timestamp).toBeGreaterThan(nowInMillis)
    })
    it('returns forbidden when request sent with incorrect email in basic authorization', async () => {
        await addUser()
        const response = await putUser(5, null, {
            auth: {
                email: "incorrectEmail@email.com",
                password: "P4ssword"
            }
        })
        expect(response.status).toBe(403)
    })
    it('returns forbidden when request sent with incorrect password in basic authorization', async () => {
        await addUser()
        const response = await putUser(5, null, {
            auth: {
                email: "user1@email.com",
                password: "IncorrectP4ssword"
            }
        })
        expect(response.status).toBe(403)
    })
    it('returns forbidden when  update request sent with correct credentials but for different user', async () => {
        await addUser()
        const userToBeUpdated = await addUser({ ...activeUser, username: "user2", email: 'user2@email.com' })
        const response = await putUser(userToBeUpdated.id, null, {
            auth: {
                email: "user1@email.com",
                password: "P4ssword"
            }
        })
        expect(response.status).toBe(403)
    })
    it('returns forbidden when  update request sent by inactive user with correct credentials for its own user', async () => {
        const inactiveUser = await addUser({ ...activeUser, incative: true })
        const response = await putUser(inactiveUser.id, null, {
            auth: {
                email: "user1@email.com",
                password: "P4ssword"
            }
        })
        expect(response.status).toBe(403)
    })
})