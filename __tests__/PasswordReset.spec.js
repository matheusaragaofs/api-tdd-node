const request = require('supertest')
const app = require('../src/app')

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

}

)