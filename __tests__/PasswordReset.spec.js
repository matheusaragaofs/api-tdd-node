const request = require('supertest')
const app = require('../src/app')
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
beforeAll(async () => {
    await sequelize.sync()
})
beforeEach(async () => {
    await User.destroy({ truncate: { cascade: true } })
})

const activeUser = { username: 'user1', email: 'user1@email.com', password: 'P4ssword', inactive: false }
const addUser = async (user = { ...activeUser }) => {
    const hash = await bcrypt.hash(user.password, 10)
    user.password = hash;
    return await User.create(user)
}


const postPasswordReset = (email = 'unkown@email.com', options = {}) => {
    const agent = request(app).post('/api/1.0/password-reset')
    return agent.send({ email })
}


describe('Password Reset Request', () => {
    it('returns 404 when a password reset request is sent for unknown e-mail', async () => {
        const response = await postPasswordReset()
        expect(response.status).toBe(404)
    })

    it('returns error body with message for unknown email for password reset request', async () => {

        const nowInMillis = new Date().getTime()
        const response = await postPasswordReset()
        expect(response.body.message).toBe('E-mail not found')
        expect(response.body.path).toBe('/api/1.0/password-reset')
        expect(response.body.timestamp).toBeGreaterThan(nowInMillis)
    })
    it('returns 400 with validation error response when request does not have valid email', async () => {
        const response = await postPasswordReset(null)
        expect(response.body.validationErrors.email).toBe('E-mail is not valid')
        expect(response.status).toBe(400)
    })
    it('returns 200 ok when a password reset request is sent for know e-mail', async () => {
        const user = await addUser()
        const response = await postPasswordReset(user.email)
        expect(response.status).toBe(200)
    })
    it('returns success response body for know email for password request', async () => {
        const user = await addUser()
        const response = await postPasswordReset(user.email)
        expect(response.body.message).toBe('Check your e-mail for resetting your passsword')
    })
    it('creates passwordResetToken when a password reset request is sent for known e-mail', async () => {
        const user = await addUser()
        await postPasswordReset(user.email)
        const userInDB = await User.findOne({ where: { email: user.email } })
        expect(userInDB.passwordResetToken).toBeTruthy()
    })
}

)