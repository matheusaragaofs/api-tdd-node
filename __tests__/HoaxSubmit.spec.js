const request = require('supertest');
const app = require('../src/app');

const User = require('../src/user/User');
const Hoax = require('../src/hoax/Hoax');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});
beforeEach(async () => {
  await Hoax.destroy({ truncate: { cascade: true } });
});

const activeUser = { username: 'user1', email: 'user1@email.com', password: 'P4ssword', inactive: false };
const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const credentials = {
  email: 'user1@email.com',
  password: 'P4ssword',
};
const postHoax = async (body = null, options = {}) => {
  let agent = request(app);

  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }

  agent = request(app).post('/api/1.0/hoaxes');

  if (options.auth && token) {
    agent.set('Authorization', `Bearer ${token}`);
  }

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }

  return agent.send(body);
};

describe('Post Hoax', () => {
  it('returns 401 status code when hoax post request has no authentication', async () => {
    const response = await postHoax();
    expect(response.status).toBe(401);
  });
  it("retruns error body with 'You are not authorized to post a Hoax' message when unauthorized request sent", async () => {
    const nowInMillis = Date.now();
    const response = await postHoax();
    expect(response.body.path).toBe('/api/1.0/hoaxes');
    expect(response.body.message).toBe('You are not authorized to post a Hoax');
    expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
  });
  it('return 200 when valid hoax submitted with authorized user', async () => {
    await addUser();
    const response = await postHoax(
      { content: 'Hoax Content' },
      {
        auth: credentials,
      }
    );
    expect(response.status).toBe(200);
  });
  it('saves the hoaxes to database when authorized user sends valid request', async () => {
    await addUser();
    await postHoax(
      { content: 'Hoax Content' },
      {
        auth: credentials,
      }
    );
    const hoaxesInDatabase = await Hoax.findAll();
    expect(hoaxesInDatabase.length).toBe(1);
  });
  it('saves the hoax content and timestamp to database', async () => {
    await addUser();
    const beforeSubmit = Date.now();
    await postHoax(
      { content: 'Hoax Content' },
      {
        auth: credentials,
      }
    );
    const [savedHoax] = await Hoax.findAll();
    expect(savedHoax.content).toBe('Hoax Content');
    expect(savedHoax.timestamp).toBeGreaterThan(beforeSubmit);
    expect(savedHoax.timestamp).toBeLessThan(Date.now());
  });
  it("returns 'Hoax Saved' message to success submit", async () => {
    const response = await postHoax(
      { content: 'Hoax Content' },
      {
        auth: credentials,
      }
    );
    expect(response.body.message).toBe('Hoax Saved');
  });
});
