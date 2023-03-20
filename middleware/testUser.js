// we will use this middleware to restrict access to certain CRUD operations (in the routes) to the test use

const {BadRequestError} = require("../errors/index")

const testUser = (req, res, next) => {
    if(req.user.testUser){
        throw new BadRequestError("Test User. Read-only rights")
    }
    next();
}

module.exports = testUser