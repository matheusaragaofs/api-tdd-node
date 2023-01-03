const request = require('supertest');
const app = require('../src/app');
const fs = require('fs');
const path = require('path');
const config = require('config');

const { uploadDir, profileDir, attachmentDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

describe('Profile Images', () => {
  const copyFile = () => {
    const storedFilename = 'test-file';

    const filePath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const targetPath = path.join(profileFolder, storedFilename);
    fs.copyFileSync(filePath, targetPath);

    return storedFilename;
  };

  it('returns 404 when file not found', async () => {
    const response = await request(app).get('/images/123456');
    expect(response.status).toBe(404);
  });
  it('returns 200 when file exist', async () => {
    const storedFilename = copyFile();

    const response = await request(app).get('/images/' + storedFilename);
    expect(response.status).toBe(200);
  });
  it('returns cache for 1 year in response', async () => {
    const storedFilename = copyFile();

    const response = await request(app).get('/images/' + storedFilename);

    const oneYearInSeconds = 365 * 24 * 60 * 60; //days * hours * minutes * seconds
    expect(response.header['cache-control']).toContain(`max-age=${oneYearInSeconds}`);
  });
});

describe('Attachments', () => {
  const copyFile = () => {
    const storedFilename = 'test-attachment-file';

    const filePath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const targetPath = path.join(attachmentFolder, storedFilename);
    fs.copyFileSync(filePath, targetPath);

    return storedFilename;
  };

  it('returns 404 when file not found', async () => {
    const response = await request(app).get('/attachments/123456');
    expect(response.status).toBe(404);
  });
  it('returns 200 when file exist', async () => {
    const storedFilename = copyFile();

    const response = await request(app).get('/attachments/' + storedFilename);
    expect(response.status).toBe(200);
  });
  it('returns cache for 1 year in response', async () => {
    const storedFilename = copyFile();

    const response = await request(app).get('/attachments/' + storedFilename);

    const oneYearInSeconds = 365 * 24 * 60 * 60; //days * hours * minutes * seconds
    expect(response.header['cache-control']).toContain(`max-age=${oneYearInSeconds}`);
  });
});
