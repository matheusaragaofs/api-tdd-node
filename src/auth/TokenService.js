const { randomString } = require('../shared/generator')
const Token = require('./Token')
const Sequelize = require('sequelize')

const ONE_WEEK_IN_MILLIS = 7 * 24 * 60 * 60 * 1000
const createToken = async (user) => {
    const token = randomString(32)
    await Token.create({ token, userId: user.id, lastUsedAt: new Date() })
    return token;

}

const verify = async (token) => {
    const oneWeekAgo = new Date(Date.now() - (ONE_WEEK_IN_MILLIS - 1))

    const tokenInDB = await Token.findOne({
        where: {
            token,
            lastUsedAt: {
                [Sequelize.Op.gt]: oneWeekAgo,
            }
        }
    })

    tokenInDB.lastUsedAt = new Date()
    await tokenInDB.save()

    const userId = tokenInDB.userId

    return {
        id: userId
    }
}

const deleteToken = async (token) => {
    await Token.destroy({ where: { token } })
}


const scheduledCleanup = () => {
    setInterval(async () => {
        const oneWeekAgo = new Date(Date.now() - (ONE_WEEK_IN_MILLIS - 1))
        await Token.destroy({
            where: {
                lastUsedAt: {
                    [Sequelize.Op.lt]: oneWeekAgo
                }
            }
        })
    }, 60 * 60 * 1000)

}

module.exports = { createToken, verify, deleteToken, scheduledCleanup }