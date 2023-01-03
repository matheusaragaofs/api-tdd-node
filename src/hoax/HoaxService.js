const User = require('../user/User');
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

const getHoaxes = async ({ page, size }) => {
  const hoaxesWithCount = await Hoax.findAndCountAll({
    attributes: ['id', 'content', 'timestamp'],
    include: {
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'email', 'image'],
    },
    order: [['id', 'DESC']],
    limit: size,
    offset: size * page,
  });

  const totalPages = Math.ceil(hoaxesWithCount.count / size);
  return {
    content: hoaxesWithCount.rows,
    page,
    size,
    totalPages,
  };
};
module.exports = { save, getHoaxes };
