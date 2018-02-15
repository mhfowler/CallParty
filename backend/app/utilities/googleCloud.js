var storage = require('@google-cloud/storage')

const { GCLOUD_KEY_PATH, GCLOUD_BUCKET_NAME } = require('../constants')


function uploadFile(srcFileName, destFileName) {
  let gcs = storage({
    projectId: process.env.GCLOUD_PROJECT,
    keyFilename: GCLOUD_KEY_PATH
  })

  var bucket = gcs.bucket(GCLOUD_BUCKET_NAME)

  // return promise for file upload
  return new Promise(function(resolve, reject) {
    console.log(`++ uploading ${srcFileName} to gcs://${GCLOUD_BUCKET_NAME}/${destFileName}`)
    bucket.upload(srcFileName, {destination: destFileName}, function (err) {
      if (!err) {
        // "zebra.jpg" is now in your bucket.
        console.log(`++ successfully uploaded ${srcFileName} to gcs://${GCLOUD_BUCKET_NAME}/${destFileName}`)
        return resolve()
      } else {
        return reject('++ failed to upload to google cloud')
      }
    })
  })
}

function makeFilePublic(filePath) {
  let gcs = storage({
    projectId: process.env.GCLOUD_PROJECT,
    keyFilename: GCLOUD_KEY_PATH
  })

  var bucket = gcs.bucket(GCLOUD_BUCKET_NAME)

  // return promise for file upload
  return new Promise(function(resolve, reject) {
    console.log(`++ making ${filePath} public`)
    bucket.file(filePath)
      .makePublic()
      .then(() => {
        console.log(`gs://${GCLOUD_BUCKET_NAME}/${filePath} is now public.`)
        resolve()
      })
      .catch(err => {
        console.error('ERROR:', err)
        reject(err)
      })
  })
}

module.exports = {
  uploadFile,
  makeFilePublic,
}

if (require.main === module) {
  // uploadFile('/Users/maxfowler/Desktop/temp.txt', 'exports/temp.txt')
  makeFilePublic('exports/temp.txt')
}