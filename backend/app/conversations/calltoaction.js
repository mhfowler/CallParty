const moment = require('moment')
const { stripIndent } = require('common-tags')
const { setUserCallback } = require('../methods/userMethods')
const { botReply } = require('../utilities/botkit')
const { UserConversation } = require('../models')

function startCallToActionConversation(user, representatives, campaignCall, campaign, userConversation) {
  const convoData = {
    firstName: user.firstName,
    issueMessage: campaign.description,
    issueLink: campaign.link,
    issueSubject: campaign.title,
    issueAction: campaignCall.cta,
    repType: representatives[0].legislatorTitle,
    repName: representatives[0].official_full,
    repImage: representatives[0].image_url,
    repPhoneNumber: representatives[0].phone,
    repWebsite: representatives[0].url,
    userConversationId: userConversation._id
  }

  // save params as convoData
  user.convoData = convoData

  return user.save().then(() =>
    // start the conversation
    const fakeMessage = {
      channel: user.fbId,
      user: user.fbId
    }
    return callToActionPart1Convo(user, fakeMessage)
  )
}

// part 1
function callToActionPart1Convo(user, message) {
  return botReply(message,
      `Hi ${user.convoData.firstName}. We've got an issue to call about.`
    )
    .then(() => botReply(message, `${user.convoData.issueMessage}. ` +
        `You can find out more about the issue here ${user.convoData.issueLink}.
    `))
    .then(() => botReply(message, stripIndent`
      You'll be calling ${user.convoData.repType} ${user.convoData.repName}. ` +
        `When you call you'll talk to a staff member, or you'll leave a voicemail.
      Let them know:
      *  You're a constituent calling about ${user.convoData.issueSubject}.
      *  The call to action: "I'd like ${user.convoData.repType} ${user.convoData.repName} to ${user.convoData.issueAction}."
      *  Share any personal feelings or stories.
      *  If taking the wrong stance on this issue would endanger your vote, let them know.
      *  Answer any questions the staffer has, and be friendly!
    `)
    })
    .then(() => {
      const msgAttachment = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [
              {
                title: `${user.convoData.repType} ${user.convoData.repName}`,
                image_url: user.convoData.repImage,
                default_action: {
                  type: 'phone_number',
                  title: user.convoData.repPhoneNumber,
                  payload: user.convoData.repPhoneNumber
                },
                buttons: [
                  {
                    type: 'phone_number',
                    title: user.convoData.repPhoneNumber,
                    payload: user.convoData.repPhoneNumber
                  },
                  {
                    type: 'web_url',
                    url: user.convoData.repWebsite,
                    title: 'View Website'
                  }
                ]
              }
            ]
          }
        }
      }
      return botReply(message, msgAttachment)
    })
    .then(() => botReply(message, 'Give me a thumbs up once you’ve tried to call!'))
    .then(() => setUserCallback(user, '/calltoaction/part2'))
}

// part 2
function callToActionPart2Convo(user, message) {
  const msg_attachment = {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: "How'd it go?",
        buttons: [
          {
            type: 'postback',
            title: 'Talked to a staffer',
            payload: 'Talked to a staffer'
          },
          {
            type: 'postback',
            title: 'Left a voicemail',
            payload: 'Left a voicemail'
          },
          {
            type: 'postback',
            title: 'Something went wrong',
            payload: 'Something went wrong'
          }
        ]
      }
    }
  }
  return Promise.all([
    UserConversation.update({ _id: user.convoData.userConversationId }, { active: true }, { multi: false }).exec(),
    botReply(message, msg_attachment)
  ])
  .then(() => setUserCallback(user, '/calltoaction/part3'))
}

// part 3
function callToActionPart3Convo(user, message) {
  if (['Left a voicemail', 'Talked to a staffer'].indexOf(message.text) >= 0) {
    return botReply(message, {
      attachment: {
        type: 'image',
        payload: {
          url: 'https://storage.googleapis.com/callparty/success.gif'
        }
      }
    })
    .then(() => botReply(message, 'Woo thanks for your work! We’ve had [callCount] calls so far. ' +
        'We’ll reach out when we have updates and an outcome on the issue.'))
    .then(() => botReply(message, 'Share this action with your friends to make it a party [link].'))
    .then(() => setUserCallback(user, null) // calltoaction is over)
  }
  else if (message.text === 'Something went wrong') {
    return botReply(message, {
      attachment: {
        type: 'image',
        payload: {
          url: 'https://storage.googleapis.com/callparty/bummer.gif'
        }
      }
    })
      .then(() => botReply(message,
          'We’re sorry to hear that, but good on you for trying! Want to tell us about it?'
      ))
      .then(() => setUserCallback(user, '/calltoaction/thanksforsharing'))
  }
  else {
    throw new Error('Received unexpected message at path /calltoaction/part3: ' + message.text)
  }
}

// thanks for sharing
function thanksForSharingConvo(user, message) {
  return UserConversation.update({ _id: user.convoData.userConversationId }, { dateCompleted: moment.utc().toDate() }).exec()
    .then(() => botReply(message, 'Thanks for sharing! We’ll reach back out if we can be helpful.'))
}


module.exports = {
  startCallToActionConversation,
  callToActionPart1Convo,
  callToActionPart2Convo,
  callToActionPart3Convo,
  thanksForSharingConvo,
}
