const User = require('../models/User')
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, UnauthenticatedError } = require('../errors')

const updateUser = async (req, res) => {
const {email, name, lastName, location} = req.body;

if(!email || !name || !lastName || !location){
  throw new BadRequestError("Please fill all values")
};

const user = await User.findOne({_id: req.user.userId});

//overwrite different values with the ones received from body (alternative to doing it via
// findOneAndUpdate() method)
user.name = name;
user.location = location;
user.email = email;
user.lastName = lastName

await user.save()
const token = user.createJWT()

res.status(StatusCodes.OK).json({
  email: user.email,
  name: user.name,
  location: user.location,
  lastName: user.lastName,
  token,
})
  
}

const register = async (req, res) => {
  const user = await User.create({ ...req.body })
  const token = user.createJWT()
  res.status(StatusCodes.CREATED).json({ user: {
     name: user.name,
     email: user.email,
     location: user.location,
     name: user.name ,
     token
    } })
}

const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw new BadRequestError('Please provide email and password')
  }
  const user = await User.findOne({ email })
  if (!user) {
    throw new UnauthenticatedError('Invalid Credentials')
  }
  const isPasswordCorrect = await user.comparePassword(password)
  if (!isPasswordCorrect) {
    throw new UnauthenticatedError('Invalid Credentials')
  }
  // compare password
  const token = user.createJWT()
  res.status(StatusCodes.OK).json({ user: {
    name: user.name,
    email: user.email,
    location: user.location,
    name: user.name ,
    token
   } })}

module.exports = {
  register,
  login,
  updateUser
}
