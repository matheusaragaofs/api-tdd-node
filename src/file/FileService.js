const fs = require('fs')
const path = require('path')
const config = require('config')
const createFolders = () => {
    const { uploadDir, profileDir } = config
    if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir)

    const profilePath = path.join('.', uploadDir, profileDir)
    if (!fs.existsSync(profilePath))
        fs.mkdirSync(profilePath)
}

module.exports = { createFolders }