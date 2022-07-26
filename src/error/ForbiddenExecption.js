module.exports = function ForbiddenExecption(message) {
    this.status = 403
    this.message = message || "Account is inactive"
}