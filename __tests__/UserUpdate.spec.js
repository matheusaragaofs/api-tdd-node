const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const config = require('config')

const { uploadDir, profileDir } = config;
const profileDirectory = path.join('.', uploadDir, profileDir)


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

const putUser = async (id = 5, body = null, options = {}) => {
    let agent = request(app)

    if (options.auth) {
        const response = await agent.post('/api/1.0/auth').send(options.auth)
        token = response.body.token
    }

    agent = request(app).put('/api/1.0/users/' + id)

    if (options.auth && token) {
        agent.set('Authorization', `Bearer ${token}`)
    }

    if (options.token) {
        agent.set('Authorization', `Bearer ${options.token}`)
    }

    return agent.send(body)
}

const readFileAsBase64 = () => {
    const filePath = path.join('.', '__tests__', 'resources', 'test-png.png')
    return fs.readFileSync(filePath, {
        encoding: 'base64'
    })

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
        const inactiveUser = await addUser({ ...activeUser, inactive: true })
        const response = await putUser(inactiveUser.id, null, {
            auth: {
                email: "user1@email.com",
                password: "P4ssword"
            }
        })
        expect(response.status).toBe(403)
    })
    it('returns 200 ok when valid update request sent from authorized user', async () => {
        const savedUser = await addUser()
        const validUpdate = { username: 'user1-updated' }
        const response = await putUser(savedUser.id, validUpdate, { auth: { email: savedUser.email, password: 'P4ssword' } })
        expect(response.status).toBe(200)
    })
    it('updates username in database when valid updated request is sent from authorized', async () => {
        const savedUser = await addUser()
        const validUpdate = { username: 'user1-updated' }
        await putUser(savedUser.id, validUpdate, {
            auth: { email: savedUser.email, password: 'P4ssword' }
        })
        const inDBUser = await User.findOne({ where: { id: savedUser.id } })
        expect(inDBUser.username).toBe(validUpdate.username)
    })

    it('returns 403 when token is not valid', async () => {
        const response = await putUser(5, null, { token: '123' })
        expect(response.status).toBe(403)
    })
    it('saves the user image when update contains image as base64', async () => {
        const filePath = path.join('.', '__tests__', 'resources', 'test-png.png')

        const fileInBase64 = fs.readFileSync(filePath, {
            encoding: 'base64'
        })
        const savedUser = await addUser()
        const validUpdate = { username: 'user1-updated', image: fileInBase64 }
        await putUser(savedUser.id, validUpdate, {
            auth: { email: savedUser.email, password: 'P4ssword' }
        })
        const inDBUser = await User.findOne({ where: { id: savedUser.id } })
        expect(inDBUser.image).toBeTruthy();
    })
    it('should returns success body having only id, username, email and image', async () => {
        const fileInBase64 = readFileAsBase64()
        const savedUser = await addUser()
        const validUpdate = { username: 'user1-updated', image: fileInBase64 }
        const response = await putUser(savedUser.id, validUpdate, {
            auth: { email: savedUser.email, password: 'P4ssword' }
        })
        expect(Object.keys(response.body)).toEqual(['id', 'username', 'email', 'image'])
    })
    it('saves the user image to upload folder and stores filename in user when update has image', async () => {
        const fileInBase64 = readFileAsBase64()
        const savedUser = await addUser()
        const validUpdate = { username: 'user1-updated', image: fileInBase64 }
        await putUser(savedUser.id, validUpdate, {
            auth: { email: savedUser.email, password: 'P4ssword' }
        })
        const inDBUser = await User.findOne({ where: { id: savedUser.id } })
        const profileImagePath = path.join(profileDirectory, inDBUser.image)
        expect(fs.existsSync(profileImagePath)).toBe(true)
    })
})