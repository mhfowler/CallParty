require('any-promise/register/es6-promise')
const Promise = require('any-promise')
const mongoose = require('mongoose')
const { logMessage } = require('../utilities/logHelper')
const { uploadFile, generateSignedUrlForFile } = require('./googleCloud')
const { sendEmail } = require('./emailHelper')
var jsonfile = require('jsonfile')
const fs = require('fs')
const { CampaignAction, User, UserAction, Reps, RepresentativeCommittee, RepresentativeSubcommittee } = require('../models')

mongoose.Promise = Promise


async function exportData(bot, email) {
  logMessage(`++ exporting data for ${bot}`)

  // get users
  const users = await User.find({bot: bot, unsubscribed: false})

  // get userActions for those users
  let userActionQuery = UserAction.aggregate()
    .lookup({ from: 'users', localField: 'user', foreignField: '_id', as: 'userInfo' })
    .unwind({ path: '$userInfo', preserveNullAndEmptyArrays: true })
  const matchParams = {
    'userInfo.bot': {$eq: bot},
    'userInfo.unsubscribed': {$eq: false}
  }
  userActionQuery = userActionQuery.match(matchParams)
  const userActions = await userActionQuery.exec()

  // get campaignActions
  const campaignActions = await CampaignAction.find({bot: bot})

  // get reps and committees
  const representatives = await Reps.find({})
  const committees = await RepresentativeCommittee.find({})
  const subCommittees = await RepresentativeSubcommittee.find({})

  // return the whole output
  const output = {
    userActions: userActions,
    users: users,
    campaignActions: campaignActions,
    representatives: representatives,
    committees: committees,
    subCommittees: subCommittees
  }

  // upload the .json to google cloud
  const randomHash = Math.random(0, 1000000)
  var tempFile = `/srv/tmp/export-${randomHash}.json`
  logMessage(`++ writing export to ${tempFile}`)
  jsonfile.writeFileSync(tempFile, output)
  logMessage(`++ successfully wrote file`)
  const destFileName = `exports/${randomHash}${bot}.json`
  await uploadFile(tempFile, destFileName)
  logMessage('++ upload complete')
  const dataLink = await generateSignedUrlForFile(destFileName)
  logMessage(`++ signed URL at ${dataLink}`)
  logMessage('++ deleting temp file')
  fs.unlink(tempFile)

  // send an email with a link
  sendEmail('CallParty Export Complete', 'dataEmail.html', {dataLink: dataLink}, email)
}

module.exports = {
  exportData
}

if (require.main === module) {
  const dotenv = require('dotenv')
  dotenv.load()
  const dbUri = process.env.MONGODB_URI || ''
  mongoose.Promise = require('es6-promise')
  mongoose.connect(dbUri)
  exportData(process.env.DEFAULT_BOT, 'maxhfowler@gmail.com').catch(function(err) {
    console.log(err)
  })
}
