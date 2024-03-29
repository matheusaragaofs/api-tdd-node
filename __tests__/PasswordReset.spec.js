const request = require('supertest')
const app = require('../src/app')
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
const SMTPServer = require('smtp-server').SMTPServer
const config = require('config');
const Token = require('../src/auth/Token');
let lastMail, server;
let simulateSmtpFailure = false;
beforeAll(async () => {
    server = new SMTPServer({
        authOptional: true,
        onData(stream, section, callback) {
            let mailBody;
            stream.on('data', (data) => {
                mailBody += data.toString();
            })
            stream.on('end', () => {
                if (simulateSmtpFailure) {
                    const err = new Error('Invalid mailbox')
                    err.responseCode = 553;
                    return callback(err)
                }
                lastMail = mailBody
                callback()
            })
        }
    })
    await server.listen(config.mail.port, 'localhost')
    jest.setTimeout(20000)
});

beforeEach(async () => {
    simulateSmtpFailure = false;
    await User.destroy({ truncate: { cascade: true } })
});

afterAll(async () => {
    await server.close()
    jest.setTimeout(5000)

})


const activeUser = { username: 'user1', email: 'user1@email.com', password: 'P4ssword', inactive: false }
const addUser = async (user = { ...activeUser }) => {
    const hash = await bcrypt.hash(user.password, 10)
    user.password = hash;
    return await User.create(user)
}


const postPasswordReset = (email = 'unkown@email.com', options = {}) => {
    const agent = request(app).post('/api/1.0/user/password')
    return agent.send({ email })
}

const putPasswordUpdate = (body = {}) => {
    const agent = request(app).put('/api/1.0/user/password')
    return agent.send(body)
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
        expect(response.body.path).toBe('/api/1.0/user/password')
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
    it('sends a password reset email with passwordResetToken',
        async () => {
            const user = await addUser()
            await postPasswordReset(user.email)
            const userInDB = await User.findOne({ where: { email: user.email } })
            const passwordResetToken = userInDB.passwordResetToken
            expect(lastMail).toContain('user1@email.com')
            expect(lastMail).toContain(passwordResetToken)
        })
    it('returns error message when sending email fails', async () => {
        simulateSmtpFailure = true
        const user = await addUser()
        const response = await postPasswordReset(user.email)
        expect(response.body.message).toBe('E-mail Failure')
    })
})

describe('Password Update', () => {
    it('returns 403 when password update request does not have the valid password reset token', async () => {
        const response = await putPasswordUpdate({
            password: 'P4ssword',
            passwordResetToken: "abcd"
        })
        expect(response.status).toBe(403)
    })
    // it('returns a error body message after trying to update with invalid token', async () => {
    //     const response = await putPasswordUpdate({
    //         password: 'P4ssword',
    //         passwordResetToken: "abcd"
    //     })

    //     const nowInMillis = new Date().getTime()
    //     expect(response.body.path).toBe('/api/1.0/user/password')
    //     expect(response.body.timestamp).toBeGreaterThan(nowInMillis)
    //     expect(response.body.memssage).toBe('Your are not authorized to update your password. Please follow the password steps again.')
    // })
    it('returns 403 when password update request with invalid password pattern and the reset token is invalid', async () => {
        const response = await putPasswordUpdate({
            password: 'not-valid',
            passwordResetToken: "abcd"
        })
        expect(response.status).toBe(403)
    })
    it('returns 403 when trying to update with invalid password and the reset token is valid', async () => {
        const user = await addUser()
        user.passwordResetToken = 'test-token'
        await user.save()

        const response = await putPasswordUpdate({
            password: 'not-valid',
            passwordResetToken: "test-token"
        })
        expect(response.status).toBe(400)
    })
    it.each`
     value              | expectedMessage
     ${null}            | ${'Password cannot be null'}
     ${'P4sww'}         | ${'Password must be at least 6 characters'}
     ${'alllowercase'}  | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
     ${'ALLUPPERCASE'}  | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
     ${'1234567890'}    | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
     ${'lowerandUPPER'} | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
     ${'lower4nd5667'}  | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
     ${'UPPER44444'}    | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
  `('returns password validation error $expectedMessage when the value is $value', async ({ value, expectedMessage }) => {
        const user = await addUser()
        user.passwordResetToken = 'test-token'
        await user.save()
        const response = await putPasswordUpdate({
            password: value,
            passwordResetToken: "test-token"
        })
        expect(response.body.validationErrors.password).toBe(expectedMessage);

    })
    it('returns 200 when valid password is sent with valid reset token ', async () => {
        const user = await addUser()
        user.passwordResetToken = 'test-token'
        await user.save()
        const response = await putPasswordUpdate({
            password: 'N3w-password',
            passwordResetToken: "test-token"
        })
        expect(response.status).toBe(200);
    })
    it('updates the password in database when the request is valid', async () => {
        const user = await addUser()
        user.passwordResetToken = 'test-token'
        await user.save()
        await putPasswordUpdate({
            password: 'N3w-password',
            passwordResetToken: "test-token"
        })
        const userInDB = await User.findOne({
            where: {
                email: 'user1@email.com'
            }
        })
        expect(userInDB.password).not.toEqual(user.password)
    })
    it('clears the reset token in database when the request is valid', async () => {
        const user = await addUser()
        user.passwordResetToken = 'test-token'
        await user.save()
        await putPasswordUpdate({
            password: 'N3w-password',
            passwordResetToken: "test-token"
        })
        const userInDB = await User.findOne({
            where: {
                email: 'user1@email.com'
            }
        })
        expect(userInDB.passwordResetToken).toBeFalsy()
    })
    it('activates and clears the activation token if the account is inactive after valid password reset', async () => {
        const user = await addUser()
        user.passwordResetToken = 'test-token'
        user.activationToken = 'activation-token';
        user.inactive = true;

        await user.save()
        await putPasswordUpdate({
            password: 'N3w-password',
            passwordResetToken: "test-token"
        })
        const userInDB = await User.findOne({
            where: {
                email: 'user1@email.com'
            }
        })
        expect(userInDB.activationToken).toBeFalsy()
        expect(userInDB.inactive).toBe(false)
    })
    it('clears all otken of user after valid password reset', async () => {
        const user = await addUser()
        user.passwordResetToken = 'test-token'

        await user.save()

        await Token.create({
            token: 'token-1',
            userId: user.id,
            lastUsedAt: Date.now()
        })

        await putPasswordUpdate({
            password: 'N3w-password',
            passwordResetToken: "test-token"
        })

        const tokens = await Token.findAll({ where: { userId: user.id } })
        expect(tokens.length).toBe(0)
    })
})