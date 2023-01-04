const User = require('../user/User');
const UserNotFoundException = require('../user/UserNotFoundException');
const FileService = require('../file/FileService');
const FileAttachment = require('../file/FileAttachment');

const Hoax = require('./Hoax');
const save = async (body, user) => {
  const { content } = body;
  const hoax = {
    content,
    timestamp: Date.now(),
    userId: user.id,
  };
  const { id } = await Hoax.create(hoax);
  if (body.fileAttachment) {
    await FileService.associateFileToHoax(body.fileAttachment, id);
  }
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
      {
        model: FileAttachment,
        as: 'fileAttachment',
        attributes: ['filename', 'fileType'],
      },
    ],
    order: [['id', 'DESC']],
    limit: size,
    offset: page * size,
  });

  return {
    content: hoaxesWithCount.rows.map((hoaxSequelize) => {
      const hoaxAsJSON = hoaxSequelize.get({ plain: true });
      if (hoaxAsJSON.fileAttachment === null) {
        delete hoaxAsJSON.fileAttachment;
      }
      return hoaxAsJSON;
    }),
    page,
    size,
    totalPages: Math.ceil(hoaxesWithCount.count / size),
  };
};
module.exports = { save, getHoaxes };
