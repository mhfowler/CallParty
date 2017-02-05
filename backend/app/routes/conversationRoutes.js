const mongoose = require('mongoose')
const Promise = require('es6-promise')

const bot = require('../botkit_controller/botkitSetup').bot
const { User, Campaign, Reps } = require('../models')

const startCallToActionConversation = require('../conversations/calltoaction').startCallToActionConversation
const startUpdateConversation = require('../conversations/update').startUpdateConversation
const startSignupConversation = require('../conversations/signup').startSignupConversation
const startTestConversation = require('../conversations/test').startTestConversation

mongoose.Promise = Promise

module.exports = function(apiRouter) {

  apiRouter.post('/start/calltoaction', function(req, res) {
    const fbId = req.body.fbId
    const userPromise = User.findOne({ fbId: fbId }).exec()
    const campaignPromise = Campaign.findById(req.body.campaignId).exec() // TODO: figure out what conditions we use to look up campaign
    const repPromise = Reps.findById(req.body.repId).exec() // TODO: figure out what conditions we use to look up rep

    Promise.all([userPromise, campaignPromise, repPromise])
      .then(function([user, campaign, rep]) {
        // const campaignAction = campaign.campaignActions.id(req.body.campaignActionId)

        startCallToActionConversation(bot, fbId, {
          firstName: user.firstName,
          issueMessage: 'test', //campaign.description,
          issueLink: 'test', //campaign.link,
          issueSubject: 'test', //campaign.title,
          // issueAction: campaignAction.cta,
          issueAction: 'test',
          repType: 'test', // rep.legislator_type,
          repName: 'test', // rep.name.official_full,
          repImage: 'test', // rep.image_url,
          repPhoneNumber: 'test', // rep.phone,
          repWebsite: 'test', //rep.url
        })

        res.send('ok')
      })
      .catch(function(err) { throw err })
  })

  apiRouter.post('/start/update', function(req, res) {
    const fbId = req.body.fbId
    const updateMessage = req.body.updateMessage
    startUpdateConversation(bot, fbId, updateMessage)
    res.send('ok')
  })

  apiRouter.post('/start/signup', function(req, res) {
    const fbId = req.body.fbId
    startSignupConversation(bot, fbId)
    res.send('ok')
  })

  apiRouter.post('/start/test', function(req, res) {
    const fbId = req.body.fbId
    startTestConversation(bot, fbId)
    res.send('ok')
  })

}
