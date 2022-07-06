const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const nodemailerStub = require("nodemailer-stub")
const EmailService = require('../src/email/EmailService')
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
};
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
    expect(response.status).toBe(400);
  });
  it('returns validationErrors field in response body when validation errors occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user@email.com',
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it('returns errors for both  when username and email is null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual[('username', 'email')];
  });

  it.each([
    ['username', 'Username cannot be null'],
    ['email', 'E-mail cannot be null'],
    ['password', 'Password cannot be null'],
  ])('when %s is null %s is recieved', async (field, expectedMessage) => {
    const user = {
      username: 'user1',
      email: 'user@email.com',
      password: 'P4ssword',
    };
    user[field] = null;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${'Username cannot be null'}
    ${'username'} | ${'usr'}           | ${'Must have min 4 and max 32 characters'}
    ${'username'} | ${'a'.repeat(33)}  | ${'Must have min 4 and max 32 characters'}
    ${'email'}    | ${null}            | ${'E-mail cannot be null'}
    ${'email'}    | ${'mail.com'}      | ${'E-mail is not valid'}
    ${'email'}    | ${'user.mail.com'} | ${'E-mail is not valid'}
    ${'email'}    | ${'user@mail'}     | ${'E-mail is not valid'}
    ${'password'} | ${null}            | ${'Password cannot be null'}
    ${'password'} | ${'P4sww'}         | ${'Password must be at least 6 characters'}
    ${'password'} | ${'alllowercase'}  | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'password'} | ${'ALLUPPERCASE'}  | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'password'} | ${'1234567890'}    | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'password'} | ${'lowerandUPPER'} | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'password'} | ${'lower4nd5667'}  | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
    ${'password'} | ${'UPPER44444'}    | ${'Password must have at least 1 uppercase, 1 lowercase letter and 1 number'}
  `('returns $expectedMessage when $field is $value', async ({ field, expectedMessage, value }) => {
    const user = {
      username: 'user1',
      email: 'user@email.com',
      password: 'P4ssword',
    };

    user[field] = value;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it('returns E-mail in use when same email is already in use', async () => {
    await User.create({ ...validUser });

    const response = await postUser();

    expect(response.body.validationErrors.email).toBe('E-mail in use');
  });
  it('returns error for both username is null and e-mail in use ', async () => {
    await User.create({ ...validUser });

    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword',
    });

    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it('creates a user in inactive mode', async () => {
    await postUser()
    const users = await User.findAll();
    const savedUser = users[0]
    expect(savedUser.inactive).toBe(true)
  })

  it('creates a user in inactive mode even the request body contains inactive as false', async () => {
    const newUser = { ...validUser, inactive: false }
    await postUser(newUser)
    const users = await User.findAll();
    const savedUser = users[0]
    expect(savedUser.inactive).toBe(true)
  })

  it('creates an activationToken for user', async () => {
    await postUser()
    const users = await User.findAll();
    const savedUser = users[0]
    expect(savedUser.activationToken).toBeTruthy()
  })

  it('it sends an Account activation email with activationToken', async () => {
    await postUser();
    const lastMail = nodemailerStub.interactsWithMail.lastMail();
    expect(lastMail.to[0]).toBe('user@email.com')
    const users = await User.findAll();
    const savedUser = users[0]
    expect(lastMail.content).toContain(savedUser.activationToken)
  })

  it('should 502 Bad Gateway when sending email fails', async () => {
    const mockSendAccountActivation = jest.spyOn(EmailService, "sendAccountActivation").mockRejectedValue({ message: 'Failed to deliver email' })
    const response = await postUser();
    expect(response.status).toBe(502)
    mockSendAccountActivation.mockRestore()
  })
  it('returns Email failure message when sending email fails', async () => {
    const mockSendAccountActivation = jest.spyOn(EmailService, "sendAccountActivation").mockRejectedValue({ message: 'Failed to deliver email' })
    const response = await postUser();
    expect(response.body.message).toBe('E-mail Failure')
    mockSendAccountActivation.mockRestore()
  })

  it('does not save user to database if activation email fails', async () => {
    const mockSendAccountActivation = jest.spyOn(EmailService, "sendAccountActivation").mockRejectedValue({ message: 'Failed to deliver email' })
    await postUser();
    mockSendAccountActivation.mockRestore()
    const users = await User.findAll()
    expect(users.length).toBe(0)
  })

});
