const fs = require('fs')
const path = require('path')
const config = require('config')
const { randomString } = require('../shared/generator')
const { runInThisContext } = require('vm')
const { uploadDir, profileDir } = config

const profileFolder = path.join('.', uploadDir, profileDir)

const createFolders = () => {
    if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir)

    if (!fs.existsSync(profileFolder))
        fs.mkdirSync(profileFolder)
}
const saveProfileImage = async (base64File = '') => {
    const filename = randomString(32)
    const filePath = path.join(profileFolder, filename)
    await fs.promises.writeFile(filePath, base64File, { encoding: 'base64' })

    return filename

}

module.exports = { createFolders, saveProfileImage }