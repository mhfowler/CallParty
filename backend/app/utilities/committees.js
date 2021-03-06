const yaml = require('js-yaml')
const fs = require('fs')
const mongoose = require('mongoose')
const {
  Committee,
  Subcommittee,
  RepresentativeCommittee,
  RepresentativeSubcommittee,
  Reps
} = require('../models')
const downloadFile = require('./downloadFile')

mongoose.Promise = require('es6-promise')

const COMMITTEE_FILE_NAME = '/tmp/committees-current.yaml'
const COMMITTEE_MEMBERSHIP_FILE_NAME = '/tmp/committee-membership-current.yaml'

function downloadCommitteeYamlFile() {
  return downloadFile(
    'https://raw.githubusercontent.com/unitedstates/congress-legislators/master/committees-current.yaml',
    COMMITTEE_FILE_NAME
  )
}

function downloadCommitteeMembershipYamlFile() {
  return downloadFile(
    'https://raw.githubusercontent.com/unitedstates/congress-legislators/master/committee-membership-current.yaml',
    COMMITTEE_MEMBERSHIP_FILE_NAME
  )
}

function loadCommitteesFromFiles() {
  console.log('Adding committees to the db...')

  if (!fs.existsSync(COMMITTEE_FILE_NAME) || !fs.existsSync(COMMITTEE_MEMBERSHIP_FILE_NAME)) {
    throw new Error('Missing committee data YAML files!')
  }

  return updateCommitteesFromYaml()
    .then(committees => Promise.all([
      mapCommitteesByThomasId(committees),
      mapSubcommitteesByThomasId(),
      mapRepsByBioguide()
    ]))
    .then(associateRepsWithCommittees)
}

function updateCommitteesFromYaml() {
  const committeesFromYaml = yaml.safeLoad(fs.readFileSync(COMMITTEE_FILE_NAME))

  return Promise.all(committeesFromYaml.map(function(committeeFromYaml) {
    return Committee.findOneAndUpdate(
      { thomasId: committeeFromYaml.thomas_id },
      {
        type: committeeFromYaml.type,
        name: committeeFromYaml.name,
        address: committeeFromYaml.address,
        phone: committeeFromYaml.phone,
        jurisdiction: committeeFromYaml.jurisdiction,
        jurisdictionSource: committeeFromYaml.jurisdiction_source,
        houseCommitteeId: committeeFromYaml.house_committee_id,
        senateCommitteeId: committeeFromYaml.senate_committee_id,
        url: committeeFromYaml.url,
        minorityUrl: committeeFromYaml.minority_url
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .exec()
      .then(function(committee) {
        console.log(`Adding subcommittees to the db for comittee: ${committee.name}`)

        return Promise.all((committeeFromYaml.subcommittees || []).map(function(subcommittee) {
          return Subcommittee.findOneAndUpdate(
            { thomasId: subcommittee.thomas_id, committee: committee._id },
            {
              name: subcommittee.name,
              address: subcommittee.address,
              phone: subcommittee.phone
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ).exec()
        }))
          .then(() => committee)
      })
  }))
}

function mapCommitteesByThomasId(committees) {
  return committees.reduce(function(committeesByThomasId, committee) {
    committeesByThomasId[committee.thomasId] = committee
    return committeesByThomasId
  }, {})
}

function mapSubcommitteesByThomasId() {
  return Subcommittee.find({}).populate('committee').exec()
    .then(subcommittees => subcommittees.reduce(function(subcommitteesByThomasId, subcommittee) {
      // the commmittee membership YAML file contains some subcommittees identified by the concatenation
      // of the thomas_id of the parent committee and the thomas_id of the subcommittee
      // see https://github.com/unitedstates/congress-legislators#committee-membership-data-dictionary
      const jointThomasId = subcommittee.committee.thomasId + subcommittee.thomasId
      subcommitteesByThomasId[jointThomasId] = subcommittee
      return subcommitteesByThomasId
    }, {}))
}

function mapRepsByBioguide() {
  return Reps.find({}).select('_id bioguide').exec()
    .then(reps => reps.reduce(function(repIdsByBioguide, rep) {
      repIdsByBioguide[rep.bioguide] = rep._id
      return repIdsByBioguide
    }, {}))
}

function associateRepsWithCommittees([committeesByThomasId, subcommitteesByThomasId, repIdsByBioguide]) {
  console.log('Associating committee members with committees...')

  const committeeMemberships = yaml.safeLoad(fs.readFileSync(COMMITTEE_MEMBERSHIP_FILE_NAME))

  return Promise.all(Object.entries(committeeMemberships).reduce(function(promises, [thomasId, committeeMembers]) {
    const committee = committeesByThomasId[thomasId]
    const subcommittee = subcommitteesByThomasId[thomasId]

    let Model = null
    let foreignKey = null
    let record = null
    if (committee) {
      Model = RepresentativeCommittee
      foreignKey = 'committee'
      record = committee
    } else if (subcommittee) {
      Model = RepresentativeSubcommittee
      foreignKey = 'subcommittee'
      record = subcommittee
    }

    if (Model) {
      promises.concat(committeeMembers.reduce(function(repAssociationPromises, committeeMember) {
        const repId = repIdsByBioguide[committeeMember.bioguide]
        if (repId) {
          const repAssociationPromise = Model.findOneAndUpdate(
            { representative: repId, [foreignKey]: record._id },
            {},
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ).exec()
          repAssociationPromises.push(repAssociationPromise)
        } else {
          console.log(`Could not find a Representative in the db with the bioguide id: ${committeeMember.bioguide}`)
        }
        return repAssociationPromises
      }, []))
    } else {
      console.log(`Could not find a committee or subcommittee in the db with the THOMAS id: ${thomasId}`)
    }

    return promises
  }, []))
}

module.exports = {
  downloadCommitteeYamlFile,
  downloadCommitteeMembershipYamlFile,
  loadCommitteesFromFiles
}
