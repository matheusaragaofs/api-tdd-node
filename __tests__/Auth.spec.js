const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt')
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
const postAuthentication = async (credentials) => {
    return await request(app).post('/api/1.0/auth').send(credentials)
}

describe('Authentication', () => {
    it('returns 200 when credentials are correct', async () => {
        await addUser()
        const response = await postAuthentication({ email: 'user1@email.com', password: 'P4ssword' })
        expect(response.status).toBe(200)
    });
    it('returns only user id, username and token when login success', async () => {
        const user = await addUser()
        const response = await postAuthentication({ email: 'user1@email.com', password: 'P4ssword' })
        expect(response.body.id).toBe(user.id)
        expect(response.body.username).toBe(user.username)
        expect(Object.keys(response.body)).toEqual(['id', 'username', 'token'])

    });
    it('returns 401 when when user does nto exist', async () => {
        const response = await postAuthentication({ email: 'user1@email.com', password: 'P4ssword' })
        expect(response.status).toBe(401)
    });
    it('returns proper error body when authentication fails', async () => {
        const nowInMilis = new Date().getTime();
        const response = await postAuthentication({ email: 'user1@email.com', password: 'P4ssword' })
        const error = response.body
        expect(error.path).toBe('/api/1.0/auth')
        expect(error.timestamp).toBeGreaterThan(nowInMilis)
        expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message'])
    });
    it('returns message when authentication fails', async () => {
        const response = await postAuthentication({ email: 'user1@.com', password: 'P4ss' })
        expect(response.body.message).toBe('Incorrect Credentials')
    });
    it('returns 401 when password is wrong', async () => {
        await addUser()
        const response = await postAuthentication({ email: 'user1@email.com', password: 'WrongPassword' })
        expect(response.status).toBe(401)
    });
    it('returns 403 when logging in with an inactive account', async () => {
        await addUser({ ...activeUser, inactive: true })
        const response = await postAuthentication({ email: 'user1@email.com', password: 'P4ssword' })
        expect(response.status).toBe(403)
    });
    it('returns proper error body when inactive authentication fails', async () => {
        await addUser({ ...activeUser, inactive: true })
        const nowInMilis = new Date().getTime();
        const response = await postAuthentication({ email: 'user1@email.com', password: 'P4ssword' })
        const error = response.body
        expect(error.path).toBe('/api/1.0/auth')
        expect(error.timestamp).toBeGreaterThan(nowInMilis)
        expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message'])
    });
    it('returns message wwhen inactive authentication fails', async () => {
        await addUser({ ...activeUser, inactive: true })
        const response = await postAuthentication({ email: 'user1@email.com', password: 'P4ssword' })
        expect(response.body.message).toBe('Account is inactive')
    });
    it('returns 401 when e-mail is not valid', async () => {
        await addUser()
        const response = await postAuthentication({ password: 'P4ssword' })
        expect(response.status).toBe(401)
    });
    it('returns 401 when password is not valid', async () => {
        await addUser()
        const response = await postAuthentication({ password: 'xyz' })
        expect(response.status).toBe(401)
    });
    it('returns token in response body when credentials are correct', async () => {
        await addUser();
        const response = await postAuthentication({ email: 'user1@email.com', password: 'P4ssword' })
        expect(response.body.token).not.toBeUndefined()
    })
}); 