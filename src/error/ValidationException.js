module.exports = function ValidationException(errors) {

    this.errors = errors
    this.status = 400
    this.message = 'Validation Failure'


}