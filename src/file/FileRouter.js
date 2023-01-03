const express = require('express');
const { saveAttachment } = require('./FileService');
const router = express.Router();
const multer = require('multer');
const upload = multer();

router.post('/api/1.0/hoaxes/attachments', upload.single('file'), async (req, res, next) => {
  const file = req.file;
  await saveAttachment({ file });
  res.send();
});

module.exports = router;
