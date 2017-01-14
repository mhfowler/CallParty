/* eslint-disable brace-style */
/* eslint-disable camelcase */
var facebook_handler = require('../controllers/botkit').handler

module.exports = function (app) {
  // public pages=============================================
  // root
  app.get('/api/home', function (req, res) {
    res.render('home')
  })

  app.get('/api/webhook', function (req, res) {
    // This enables subscription to the webhooks
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.FACEBOOK_VERIFY_TOKEN) {
      res.send(req.query['hub.challenge'])
    }
    else {
      res.send('Incorrect verify token')
    }
  })

  app.get('/api/test', function (req, res) {
    res.json({'message': 'hello'});
  })

  app.post('/api/webhook', function (req, res) {
    facebook_handler(req.body)

    res.send('ok')
  })
}
/* eslint-disable brace-style */
/* eslint-disable camelcase */
