const Hoax = require('./Hoax');
const save = async (body, user) => {
  const { content } = body;
  const hoax = {
    content,
    timestamp: Date.now(),
    userId: user.id,
  };
  await Hoax.create(hoax);
};

module.exports = { save };
