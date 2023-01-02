const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
const Token = require('../src/auth/Token');
beforeAll(async () => {
  if (process.env.NODE_ENV === 'test')
    //our database should initialize the database with migrations
    //that running the test in memory, so we have to sync, cause has no migrations
    await sequelize.sync();
});
beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});
const activeUser = { username: 'user1', email: 'user1@email.com', password: 'P4ssword', inactive: false };
const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};
const postAuthentication = async (credentials) => {
  return await request(app).post('/api/1.0/auth').send(credentials);
};
const credentials = { email: 'user1@email.com', password: 'P4ssword' };
describe('Authentication', () => {
  it('returns 200 when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication(credentials);
    expect(response.status).toBe(200);
  });
  it('returns only user id, username, token and image when login success', async () => {
    const user = await addUser();
    const response = await postAuthentication(credentials);
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username', 'token', 'image']);
  });
  it('returns 401 when when user does nto exist', async () => {
    const response = await postAuthentication(credentials);
    expect(response.status).toBe(401);
  });
  it('returns proper error body when authentication fails', async () => {
    const nowInMilis = new Date().getTime();
    const response = await postAuthentication(credentials);
    const error = response.body;
    expect(error.path).toBe('/api/1.0/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMilis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });
  it('returns message when authentication fails', async () => {
    const response = await postAuthentication({ email: 'user1@.com', password: 'P4ss' });
    expect(response.body.message).toBe('Incorrect Credentials');
  });
  it('returns 401 when password is wrong', async () => {
    await addUser();
    const response = await postAuthentication({ email: 'user1@email.com', password: 'WrongPassword' });
    expect(response.status).toBe(401);
  });
  it('returns 403 when logging in with an inactive account', async () => {
    await addUser({ ...activeUser, inactive: true });
    const response = await postAuthentication(credentials);
    expect(response.status).toBe(403);
  });
  it('returns proper error body when inactive authentication fails', async () => {
    await addUser({ ...activeUser, inactive: true });
    const nowInMilis = new Date().getTime();
    const response = await postAuthentication(credentials);
    const error = response.body;
    expect(error.path).toBe('/api/1.0/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMilis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });
  it('returns message wwhen inactive authentication fails', async () => {
    await addUser({ ...activeUser, inactive: true });
    const response = await postAuthentication(credentials);
    expect(response.body.message).toBe('Account is inactive');
  });
  it('returns 401 when e-mail is not valid', async () => {
    await addUser();
    const response = await postAuthentication({ password: 'P4ssword' });
    expect(response.status).toBe(401);
  });
  it('returns 401 when password is not valid', async () => {
    await addUser();
    const response = await postAuthentication({ password: 'xyz' });
    expect(response.status).toBe(401);
  });
  it('returns token in response body when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication(credentials);
    expect(response.body.token).not.toBeUndefined();
  });
});

const postLogout = (options = {}) => {
  const agent = request(app).post('/api/1.0/logout');
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('Logout', () => {
  it('returns 200 ok when unauthorized request send for logout', async () => {
    const response = await postLogout();
    expect(response.status).toBe(200);
  });

  it('removes the token from database', async () => {
    await addUser();
    const response = await postAuthentication(credentials);
    const token = response.body.token;
    await postLogout({ token });
    const storedToken = await Token.findOne({
      where: {
        token,
      },
    });
    expect(storedToken).toBeNull();
  });
});

describe('Token Expiration', () => {
  const putUser = async (id = 5, body = null, options = {}) => {
    let agent = request(app);

    agent = request(app).put('/api/1.0/users/' + id);

    if (options.token) {
      agent.set('Authorization', `Bearer ${options.token}`);
    }

    return agent.send(body);
  };

  it('returns 403 when token is older than 1 week', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const weekInMiliseconds = 7 * 24 * 60 * 60 * 1000;
    const oneWeekAgo = new Date(Date.now() - (weekInMiliseconds - 1));

    await Token.create({
      token,
      userId: savedUser.id,
      lastUsedAt: oneWeekAgo,
    });

    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(savedUser.id, validUpdate, { token });
    expect(response.status).toBe(403);
  });
  it('refreshes lastUsedAt when unexpired token is used', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const fourDaysAgo = 4 * 24 * 60 * 60 * 1000;
    const oneWeekAgo = new Date(Date.now() - (fourDaysAgo - 1));

    await Token.create({
      token,
      userId: savedUser.id,
      lastUsedAt: oneWeekAgo,
    });

    const validUpdate = { username: 'user1-updated' };

    const rightBeforeSendingRequest = new Date();

    await putUser(savedUser.id, validUpdate, { token });
    const tokenInDB = await Token.findOne({
      where: {
        token,
      },
    });

    expect(tokenInDB.lastUsedAt.getTime()).toBeGreaterThan(rightBeforeSendingRequest.getTime());
  });
  it('refreshes lastUsedAt when unexpired token is used for unauthenticated endpoint', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const fourDaysAgo = 4 * 24 * 60 * 60 * 1000;
    const oneWeekAgo = new Date(Date.now() - (fourDaysAgo - 1));

    await Token.create({
      token,
      userId: savedUser.id,
      lastUsedAt: oneWeekAgo,
    });

    const rightBeforeSendingRequest = new Date();
    await request(app).get('/api/1.0/users/5').set('Authorization', `Bearer ${token}`);
    const tokenInDB = await Token.findOne({
      where: {
        token,
      },
    });

    expect(tokenInDB.lastUsedAt.getTime()).toBeGreaterThan(rightBeforeSendingRequest.getTime());
  });
});
