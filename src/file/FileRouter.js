const express = require('express');
const { saveAttachment } = require('./FileService');
const router = express.Router();
const multer = require('multer');
const FileSizeException = require('./FileSizeException');
const FIVE_MB = 5 * 1024 * 1024;
const upload = multer({ limits: { fileSize: FIVE_MB } }).single('file');

router.post('/api/1.0/hoaxes/attachments', (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return next(new FileSizeException());
    }
    const attachment = await saveAttachment({ file: req.file });
    res.send(attachment);
  });
});

module.exports = router;
