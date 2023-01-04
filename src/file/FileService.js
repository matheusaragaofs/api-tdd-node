const fs = require('fs');
const path = require('path');
const config = require('config');
const { randomString } = require('../shared/generator');
const Sequelize = require('sequelize')
const { uploadDir, profileDir, attachmentDir } = config;
const detect = require('detect-file-type');
const FileAttachment = require('./FileAttachment');

const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

const createFolders = () => {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  if (!fs.existsSync(profileFolder)) fs.mkdirSync(profileFolder);

  if (!fs.existsSync(attachmentFolder)) fs.mkdirSync(attachmentFolder);
};
const saveProfileImage = async (base64File = '') => {
  const filename = randomString(32);
  const filePath = path.join(profileFolder, filename);
  await fs.promises.writeFile(filePath, base64File, { encoding: 'base64' });

  return filename;
};

const deleteProfileImage = async (filename) => {
  const filePath = path.join(profileFolder, filename);
  await fs.promises.unlink(filePath);
};

const isLessThan2MB = (buffer) => buffer.length < 2 * 1024 * 1024;

const isSupportedFileType = (buffer) =>
  new Promise((resolve, reject) => {
    detect.fromBuffer(buffer, (err, result) => {
      const validMimes = ['image/png', 'image/jpeg'];
      if (!result?.mime || !validMimes.includes(result.mime)) resolve(false);
      resolve(true);
    });
  });

const getFileType = (buffer) =>
  new Promise((resolve, reject) => {
    detect.fromBuffer(buffer, (err, result) => {
      if (!err) resolve(result);
      else {
        reject(err);
      }
    });
  });

const saveAttachment = async ({ file }) => {
  const type = await getFileType(file.buffer);
  let fileType;
  let filename = randomString(32);
  if (type) {
    fileType = type.mime;
    filename += `.${type.ext}`;
  }
  await fs.promises.writeFile(path.join(attachmentFolder, filename), file.buffer);
  const savedAttachment = await FileAttachment.create({
    filename,
    uploadDate: new Date(),
    fileType,
  });
  return {
    id: savedAttachment.id,
  };
};
const associateFileToHoax = async (attachmentId, hoaxId) => {
  const attachment = await FileAttachment.findOne({ where: { id: attachmentId } });
  if (!attachment || attachment.hoaxId) return;
  attachment.hoaxId = hoaxId;
  await attachment.save();
};

const removeUnusedAttachments = async () => {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const oneDayOld = new Date(Date.now() - ONE_DAY);

  setInterval(async () => {
    const attachments = await FileAttachment.findAll({
      where: {
        uploadDate: {
          [Sequelize.Op.lt]: oneDayOld,
        },
        hoaxId: {
          [Sequelize.Op.is]: null,
        },
      },
    });
    for (let attachment of attachments) {
      const { filename } = attachment.get({ plain: true });
      await fs.promises.unlink(path.join(attachmentFolder, filename));
      await attachment.destroy();
    }
  }, ONE_DAY);

}

module.exports = {
  createFolders,
  saveProfileImage,
  deleteProfileImage,
  isLessThan2MB,
  isSupportedFileType,
  saveAttachment,
  associateFileToHoax,
  removeUnusedAttachments
};
