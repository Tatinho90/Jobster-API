const express = require('express')
const router = express.Router()
const { register, login, updateUser } = require('../controllers/auth')
const authenticationMiddleware = require("../middleware/authentication")
const testUser = require("../middleware/testUser")
const rateLimiter = require("express-rate-limit")

//this will limit the amount a user can register to 10 times per IP address for every 15 mins
//this will not apply to all routes, but will be a middleware that we apply to only 2 places
//don't forget to add app.set("trust proxy", 1) in the app.js file for it work after deployment
const apiLimiter = rateLimiter({
    windowMS: 15*60*1000, // 15 mins in miliseconds
    max: 10,
    message:{
        msg: `Too many request from this IP, please try again in 15 mins`
    }
})

router.post('/register', apiLimiter, register)
router.post('/login',apiLimiter, login)
router.patch("/updateUser",authenticationMiddleware,testUser,updateUser)

module.exports = router
