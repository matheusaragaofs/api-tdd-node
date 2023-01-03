const express = require('express');
const { saveAttachment } = require('./FileService');
const router = express.Router();

router.post('/api/1.0/hoaxes/attachments', async (req, res, next) => {
  await saveAttachment();
  res.send();
});

module.exports = router;
