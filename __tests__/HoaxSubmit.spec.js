const request = require('supertest');
const app = require('../src/app');

const User = require('../src/user/User');
const Hoax = require('../src/hoax/Hoax');
const bcrypt = require('bcrypt');
const FileAttachment = require('../src/file/FileAttachment');
const path = require('path');

beforeEach(async () => {
  await FileAttachment.destroy({ truncate: true });
  await User.destroy({ truncate: { cascade: true } });
  // if the user table was deleted, by on cascade delete , the hoax table will be deleted too.
  // entities associated with this user, will also be gone
  // await Hoax.destroy({ truncate: { cascade: true } });
});

const activeUser = { username: 'user1', email: 'user1@email.com', password: 'P4ssword', inactive: false };
const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const uploadFile = (file = 'test-png.png') => {
  const agent = request(app).post('/api/1.0/hoaxes/attachments');
  return agent.attach('file', path.join('.', '__tests__', 'resources', file));
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
  it('saves the hoax content to database', async () => {
    await addUser();
    const beforeSubmit = Date.now().toString();
    await postHoax(
      { content: 'Hoax Content' },
      {
        auth: credentials,
      }
    );
    const hoaxes = await Hoax.findAll();
    const savedHoax = hoaxes[0];
    expect(savedHoax.content).toBe('Hoax Content');
  });
  it("returns 'Hoax Saved' message to success submit", async () => {
    await addUser();
    const response = await postHoax(
      { content: 'Hoax Content' },
      {
        auth: credentials,
      }
    );
    expect(response.body.message).toBe('Hoax Saved');
  });
  it("returns 400 and 'Validation Failure' message when content length is less than 10", async () => {
    await addUser();
    const response = await postHoax(
      { content: 'abc' },
      {
        auth: credentials,
      }
    );
    expect(response.body.message).toBe('Validation Failure');
    expect(response.status).toBe(400);
  });
  it('returns validation error body when an invalid hoax post by authorized user', async () => {
    await addUser();
    const nowInMillis = Date.now();
    const response = await postHoax({ content: '123456789' }, { auth: credentials });
    const error = response.body;
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(error.path).toBe('/api/1.0/hoaxes');
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });
  it.each`
    content             | contentForDescription | message
    ${null}             | ${'null'}             | ${'Hoax must be min 10 and max 5000 characters'}
    ${'a'.repeat(9)}    | ${'short'}            | ${'Hoax must be min 10 and max 5000 characters'}
    ${'a'.repeat(5001)} | ${'very long'}        | ${'Hoax must be min 10 and max 5000 characters'}
  `('returns $message when the content is $contentForDescription', async ({ content, message }) => {
    await addUser();
    const response = await postHoax({ content }, { auth: credentials });
    expect(response.body.validationErrors.content).toBe(message);
  });
  it('stores hoax owner id in database ', async () => {
    const user = await addUser();
    await postHoax({ content: 'Hoax Content' }, { auth: credentials });
    const [hoax] = await Hoax.findAll();
    expect(hoax.userId).toBe(user.id);
  });
  it('associates hoax with attachment in database', async () => {
    const uploadResponse = await uploadFile();
    const uploadedFileId = uploadResponse.body.id;
    await addUser();
    await postHoax(
      {
        content: 'Hoax content',
        fileAttachment: uploadedFileId,
      },
      { auth: credentials }
    );
    const hoaxes = await Hoax.findAll();
    const hoax = hoaxes[0];

    const attachmentInDb = await FileAttachment.findOne({ where: { id: uploadedFileId } });
    expect(attachmentInDb.hoaxId).toBe(hoax.id);
  });
  it('returns 200 ok even the attachment does not exist', async () => {
    await addUser();
    const response = await postHoax({ content: 'Hoax content', fileAttachment: 1000 }, { auth: credentials });
    expect(response.status).toBe(200);
  });
  it('keeps the old associated hoax when new hoax submitted with old attachment id', async () => {
    const uploadResponse = await uploadFile();
    const uploadedFileId = uploadResponse.body.id;
    await addUser();
    await postHoax(
      {
        content: 'Hoax content',
        fileAttachment: uploadedFileId,
      },
      { auth: credentials }
    );
    const attachment = await FileAttachment.findOne({ where: { id: uploadedFileId } });
    await postHoax(
      {
        content: 'Hoax content 2',
        fileAttachment: uploadedFileId,
      },
      { auth: credentials }
    );
    const attachmentAfterSecondPost = await FileAttachment.findOne({ where: { id: uploadedFileId } });

    expect(attachment.hoaxId).toBe(attachmentAfterSecondPost.hoaxId);
  });
});
