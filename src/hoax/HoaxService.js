const Hoax = require('./Hoax');
const save = async (body) => {
  const { content } = body;
  const hoax = {
    content,
    timestamp: Date.now(),
  };
  await Hoax.create(hoax);
};

module.exports = { save };
