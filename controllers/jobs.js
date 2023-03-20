const Job = require('../models/Job')
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, NotFoundError } = require('../errors')
const mongoose = require("mongoose")
//this package is used to format dates
const moment = require("moment")


const getAllJobs = async (req, res) => {

const {search, sort, jobType, status} = req.query

//this is then used in the Job.find to filter by. Below, we will add the different filter properties to it
const queryObject = {
  createdBy: req.user.userId
}

if(search){
  //this searches by a regex . Options: 1 means the same as i in a regex (capital and small as well)
  queryObject.position = {$regex: search, $options: "i"} 
}

if(jobType && jobType !== "all"){
  queryObject.jobType = jobType
}

if(status && status !== "all"){
  queryObject.status = status
}

//this is a let as we will chain on it later (also why there is no await)
  let result =  Job.find(queryObject)

  //chain sort conditions

  if (sort === "latest"){
    result = result.sort("-createdAt")
  }

  if (sort === "newest"){
    result = result.sort("createdAt")
  }

  if (sort === "a-z"){
    result = result.sort("position")
  }

  if (sort === "z-a"){
    result = result.sort("-position")
  }

//set up pagination > better to set this up on the backend to improve performance (if this was set up on the frontend, it would always need to load all the data and then filter it, sort it, etc. Here we are only sending the necessary data)

const page = Number(req.query.page) || 1;
//in this case, the limit is not provided on the frontend, therefore will always be defaulted to 10 (functionality could be set up if desired)
const limit = Number(req.query.limit) || 10;
const skip = (page - 1) * 10

// skip and limit are mongoose methods, just like find, findOne, create, and sort
result = result.skip(skip).limit(limit)

//countDocuments is a mongoose method counting the results based on the filter criteria
const totalJobs = await Job.countDocuments(queryObject)
const numOfPages = Math.ceil(totalJobs / limit)


  const jobs = await result
  res.status(StatusCodes.OK).json({ jobs, totalJobs, numOfPages })
}
const getJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findOne({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const createJob = async (req, res) => {
  req.body.createdBy = req.user.userId
  const job = await Job.create(req.body)
  res.status(StatusCodes.CREATED).json({ job })
}

const updateJob = async (req, res) => {
  const {
    body: { company, position },
    user: { userId },
    params: { id: jobId },
  } = req

  if (company === '' || position === '') {
    throw new BadRequestError('Company or Position fields cannot be empty')
  }
  const job = await Job.findByIdAndUpdate(
    { _id: jobId, createdBy: userId },
    req.body,
    { new: true, runValidators: true }
  )
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const deleteJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findByIdAndRemove({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).send()
}

//mongoose aggregation pipeline

const showStats = async (req, res) => {
  // aggregate is the mongoose method for aggegation pipelines
let stats = await Job.aggregate([
  //first step is to filter (match) all jobs that belong to the currently logged in user (we only want to display the jobs that belong to a certain user)
  //mongoose operator (like $regex for example)
  //the mongoose.type is required because the req.user.userId is a string and we want to match to an objectId type
  {$match: {createdBy: mongoose.Types.ObjectId(req.user.userId)}},
  // grouping by statuses,a nd counting how many per counts there are
  //_id is just how we call the property
  {$group: {_id: "$status", count: {$sum: 1}}}
])

//transforming the data to the format the frontend needs with the help of JS reduce method (accumulator, current)

stats = stats.reduce((acc, curr) => {
const {_id: title, count } = curr
acc[title] = count
return acc
}, {})

// to avoid bugs if no jobs are there

const defaultStats = {
  pending: stats.pending || 0,
  interview : stats.interview || 0,
  declined: stats.declined || 0
}

let monthlyApplications = await Job.aggregate([
  {$match : {createdBy: mongoose.Types.ObjectId(req.user.userId)}},
  {$group: {
    _id: {year: {$year: `$createdAt`}, month: {$month:`$createdAt`}},
    count: {$sum: 1}
  }},
  {$sort: {"_id.year": -1, "_id.month": -1}},
  {$limit: 6}

])

monthlyApplications = monthlyApplications.map((item) =>{
const{_id :{year, month}, count}= item;
// we use the moment package to generate correct date format
const date = moment()
//we substract 1 from the month becasue mongoose treats months differently than moment
.month(month-1)
.year(year)
.format("MMM Y")
return {date, count}
}
).reverse()
//we reversed it as we want to display the last month as the first


  res.status(StatusCodes.OK).json({
    defaultStats,
    monthlyApplications,
  })
}

module.exports = {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  getJob,
  showStats,
}
