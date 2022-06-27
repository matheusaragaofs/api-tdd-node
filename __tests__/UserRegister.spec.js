const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

const validUser = {
  username: 'user1',
  email: 'user@email.com',
  password: 'P4ssword',
}
const postUser = (user = validUser) => {
  return request(app).post('/api/1.0/users').send(user);
};

describe('User registration', () => {


  it('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe('User created');
  });

  it('saves the user to database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user@email.com');
  });

  it('should hashes the password in database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4ssword');
  });
  it('returns 400  when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user@email.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(400)
  })
  it('returns validationErrors field in response body when validation errors occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user@email.com',
      password: 'P4ssword',
    });
    const body = response.body
    expect(body.validationErrors).not.toBeUndefined()
  })
  it('returns Username can not be null when username is null errors occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user@email.com',
      password: 'P4ssword',
    });
    const body = response.body
    expect(body.validationErrors.username).toBe("Username can not be null")
  })
  it('returns E-mail can not be null when username is null errors occurs', async () => {
    const response = await postUser({
      username: 'user1',
      email: null,
      password: 'P4ssword',
    });
    const body = response.body
    expect(body.validationErrors.email).toBe("E-mail can not be null")
  })
  it('returns errors for both  when username and email is null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    const body = response.body
    expect(Object.keys(body.validationErrors)).toEqual['username', 'email']
  })
});
