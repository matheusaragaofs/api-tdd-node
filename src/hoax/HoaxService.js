const User = require('../user/User');
const UserNotFoundException = require('../user/UserNotFoundException');
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

const getHoaxes = async ({ page, size, userId }) => {
  let where = {};
  if (userId) {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new UserNotFoundException();
    }

    where = { id: userId };
  }
  const hoaxesWithCount = await Hoax.findAndCountAll({
    attributes: ['id', 'content', 'timestamp'],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'image'],
        where,
      },
    ],
    order: [['id', 'DESC']],
    limit: size,
    offset: page * size,
  });

  return {
    content: hoaxesWithCount.rows,
    page,
    size,
    totalPages: Math.ceil(hoaxesWithCount.count / size),
  };
};
module.exports = { save, getHoaxes };
