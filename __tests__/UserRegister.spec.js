const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const SMTPServer = require('smtp-server').SMTPServer

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
  await server.listen(8587, 'localhost')
  await sequelize.sync();
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

  it('sends an Account activation email with activationToken', async () => {
    await postUser();

    const users = await User.findAll();
    const savedUser = users[0]

    expect(lastMail).toContain('user@email.com')
    expect(lastMail).toContain(savedUser.activationToken)
  })

  it('should 502 Bad Gateway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502)
  })
  it('returns Email failure message when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe('E-mail Failure')
  })

  it('does not save user to database if activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const users = await User.findAll()
    expect(users.length).toBe(0)
  })
  it('returns Validation Failure message in error response body when validation fails', async () => {
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword'
    })
    expect(response.body.message).toBe('Validation Failure')

  })
});
describe('Account activation', () => {
  it('activates the account when correct token is sent', async () => {
    await postUser()
    let users = await User.findAll()
    const token = users[0].activationToken;

    await request(app).post('/api/1.0/users/token/' + token).send()
    users = await User.findAll()

    expect(users[0].inactive).toBe(false)
  })
  it('removes the token from user table after successful activation', async () => {
    await postUser()
    let users = await User.findAll()
    const token = users[0].activationToken;

    await request(app).post('/api/1.0/users/token/' + token).send()
    users = await User.findAll()

    expect(users[0].activationToken).toBeFalsy()
  })
  it('doest not activate the account when token is wrong', async () => {
    await postUser()
    let users = await User.findAll()
    const token = 'this-token-does-not-exist';

    await request(app).post('/api/1.0/users/token/' + token).send()
    users = await User.findAll()

    expect(users[0].inactive).toBe(true)
  })
  it('returns bad request when token is wrong', async () => {
    await postUser()
    const token = 'this-token-does-not-exist';

    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send()

    expect(response.status).toBe(400)
  })
  it('returns error message when token is wrong', async () => {
    await postUser()
    const token = 'this-token-does-not-exist';

    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send()

    expect(response.body.message).toBe('This account is either active or the token is invalid')
  })

})
describe('Error Model', () => {
  it('returns path, timestamp, messsage and validationErros in response when validation failure', async () => {
    const response = await postUser({ ...validUser, username: null })
    const body = response.body
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message', 'validationErrors'])
  })

  it('returns path, timestamp and message in response when request fails other than validation error', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send()
    const body = response.body
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message'])

  })
  it('returns path in error body', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send()
    const body = response.body
    expect(body.path).toEqual('/api/1.0/users/token/' + token)

  })
  it('returns timestamp in milliseconds within 5 seconds value in error body', async () => {
    const nowInMillis = new Date().getTime();
    const fiveSecondsLater = nowInMillis + 5 * 1000;
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send()
    const body = response.body
    expect(body.timestamp).toBeGreaterThan(nowInMillis)
    expect(body.timestamp).toBeLessThan(fiveSecondsLater)
  })
});