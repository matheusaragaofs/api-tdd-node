const request = require('supertest');
const app = require('../src/app');

describe('Listing Users', () => {
    it('returns 200 ok when there are no user in datase', async () => {
        //independente se hovuer ou não usuários no banco de dados retornará status 200;

        const response = await request(app).get('/api/1.0/users');
        expect(response.status).toBe(200)
    })
    it('returns page object as response body', async () => {
        const response = await request(app).get('/api/1.0/users')
        expect(response.body).toEqual({
            content: [],
            page: 0,
            size: 10,
            totalPages: 0
        })
    })

});