const fs = require('fs');
const path = require('path');
const config = require('config');
const { randomString } = require('../shared/generator');

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
  await FileAttachment.create({
    filename,
    uploadDate: new Date(),
    fileType,
  });
};

module.exports = {
  createFolders,
  saveProfileImage,
  deleteProfileImage,
  isLessThan2MB,
  isSupportedFileType,
  saveAttachment,
};
