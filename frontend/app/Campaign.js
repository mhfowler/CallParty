import React, { Component } from 'react'
import { Link, browserHistory } from 'react-router'
import moment from 'moment'
import Loader from 'react-loader'
import API from './helpers/API'
import Modal from 'react-modal'
import ReactTooltip from 'react-tooltip'
import { CONFIRMATION_MODAL_STYLE } from './helpers/constants'

const DATE_FORMAT = 'h:mma on M/DD/YYYY'

function compareCampaigns(a, b) {
  if (a.lastCampaignActionSentAt < b.lastCampaignActionSentAt || !a.lastCampaignActionSentAt) {
    return 1
  } else if (a.lastCampaignActionSentAt > b.lastCampaignActionSentAt) {
    return -1
  } else {
    return 0
  }
}

class Campaigns extends Component {
  constructor(props) {
    super(props)
    this.state = {
      campaigns: [],
      loaded: false
    }

    this.viewCampaign = this.viewCampaign.bind(this)
  }

  componentWillMount() {
    API.campaigns(data => {
      this.setState({
        campaigns: data,
        loaded: true
      })
    })
  }

  render() {
    const campaigns = this.state.campaigns.sort(compareCampaigns).map(campaign => {
      return <CampaignItem key={campaign.id} onClick={this.viewCampaign} {...campaign} />
    })

    return (
      <Loader loaded={this.state.loaded}>
        <div className="table">
          <div className="table-header">
            <h1>Campaigns</h1>
            <div className="table-header-buttons">
              <Link className="button" to="/new">New Campaign</Link>
            </div>
          </div>
          <table>
            <tbody>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Description</th>
                <th>Date Created</th>
                <th>Last Conversation Sent</th>
              </tr>
              {campaigns}
            </tbody>
          </table>
        </div>
      </Loader>
    )
  }

  viewCampaign(campaign) {
    this.props.router.push(`/${campaign.id}`)
  }
}

class CampaignItem extends Component {
  static get propTypes() {
    return { onClick: React.PropTypes.func.isRequired }
  }

  render() {
    const createdAt = moment.utc(this.props.createdAt).local().format(DATE_FORMAT)

    let lastCampaignActionSentAt = 'N/A'
    if (this.props.lastCampaignActionSentAt) {
      lastCampaignActionSentAt = moment.utc(this.props.lastCampaignActionSentAt).local().format(DATE_FORMAT)
    }

    return <tr onClick={() => this.props.onClick(this.props)}>
      <td>{this.props.id}</td>
      <td>{this.props.title}</td>
      <td>{this.props.description}</td>
      <td>{createdAt}</td>
      <td>{lastCampaignActionSentAt}</td>
    </tr>
  }
}

function compareCampaignActions(a, b) {
  if (a.createdAt < b.createdAt) {
    return 1
  } else if (a.createdAt > b.createdAt) {
    return -1
  } else {
    return 0
  }
}

class Campaign extends Component {
  constructor(props) {
    super(props)
    this.state = {
      campaignActions: [],
      title: '',
      loaded: false,
      confirmationModalIsOpen: false
    }

    this.closeConfirmationModal = this.closeConfirmationModal.bind(this)
    this.openConfirmationModal = this.openConfirmationModal.bind(this)
    this.deleteCampaignAction = this.deleteCampaignAction.bind(this)
    this.clickDeleteCampaignAction = this.clickDeleteCampaignAction.bind(this)
  }

  componentWillMount() {
    API.campaign(this.props.params.id, data => {
      this.setState(data)
      this.setState({loaded: true})
    })
  }

  get breadcrumbTitle () {
    return this.state.title || this.props.params.id
  }

  deleteCampaignAction () {
    alert('++ deleting')
  }

  clickDeleteCampaignAction (ev, campaignAction) {
    ev.preventDefault()
    ev.stopPropagation()
    this.openConfirmationModal()
  }

  closeConfirmationModal() {
    this.setState({ confirmationModalIsOpen: false })
  }

  openConfirmationModal() {
    this.setState({ confirmationModalIsOpen: true })
  }

  render() {
    const createdAt = moment.utc(this.state.createdAt).local().format(DATE_FORMAT)
    const campaignActions = this.state.campaignActions.sort(compareCampaignActions).map((campaignAction, i) => {
      return <CampaignAction
        key={i}
        num={i}
        campaignId={this.props.params.id}
        campaignActionId={campaignAction.id}
        clickDeleteCampaignAction={this.clickDeleteCampaignAction}
        {...campaignAction}
      />
    })

    return (
      <Loader loaded={this.state.loaded}>
        <div className="campaign">
          <ReactTooltip effect="solid" place="top" wrapper="span" />
          <Modal
            isOpen={this.state.confirmationModalIsOpen}
            style={CONFIRMATION_MODAL_STYLE}
            contentLabel="Confirm"
          >
            <p style={{ marginBottom: '10px' }}>Are you sure you want to delete this campaign action?</p>
            <div>
              <button onClick={this.deleteCampaignAction} style={{ marginRight: '10px' }}>Yes</button>
              <button onClick={this.closeConfirmationModal}>No</button>
            </div>
          </Modal>
          <div className="meta">
            <h1>Campaign: <span>{this.state.title}</span></h1>
            <p>Description: {this.state.description}</p>
            <p>Created at {createdAt}</p>
          </div>
          <div className="table">
            <div className="table-header">
              <h2>Conversations</h2>
              <div className="table-header-buttons">
                <Link className="button" to={`/${this.props.params.id}/call/new`}>New Call</Link>
                <Link className="button" to={`/${this.props.params.id}/update/new`}>New Message</Link>
              </div>
            </div>
            <table>
              <tbody>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Label</th>
                  <th>Date Created</th>
                  <th>Actions</th>
                </tr>
                {campaignActions}
              </tbody>
            </table>
          </div>
        </div>
      </Loader>
    )
  }
}

const ACTION_TYPES = {
  CampaignCall: 'call',
  CampaignUpdate: 'update'
}

function CampaignAction(props) {
  const createdAt = moment.utc(props.createdAt).local().format(DATE_FORMAT)
  const createDuplicateUrl = `/${props.campaignId}/${ACTION_TYPES[props.type]}/new?cloneId=${props.campaignActionId}`
  const redirectToCampaignActionPage = () => browserHistory.push(`/${props.campaignId}/actions/${props.campaignActionId}`)

  return (
    <tr onClick={redirectToCampaignActionPage}>
      <td>{props.num}</td>
      <td>{ACTION_TYPES[props.type]}</td>
      <td>{props.label}</td>
      <td>{createdAt}</td>
      <td>
        <Link className="actionLink" to={createDuplicateUrl} onClick={e => e.stopPropagation()}>
          <img data-tip="Duplicate" src="/public/icons/duplicate-icon-db.svg" />
        </Link>
        <a className="actionLink" onClick={e => props.clickDeleteCampaignAction(e, props)}>
          <img data-tip="Delete" src="/public/icons/trash-icon-db.svg" />
        </a>
      </td>
    </tr>
  )
}

class NewCampaign extends Component {
  constructor(props) {
    super(props)

    this.onSubmit = this.onSubmit.bind(this)
  }
  static get contextTypes() {
    return { notify: React.PropTypes.func.isRequired }
  }

  componentWillMount() {
    this.setState({
      title: '',
      description: ''
    })
  }

  onSubmit(ev) {
    ev.preventDefault()
    API.newCampaign(this.state, campaign => {
      this.context.notify({
        message: `Campaign created`,
        level: 'success',
        autoDismiss: 1,
        onRemove: () => {
          this.props.router.push(`/${campaign.id}`)
        }
      })
    })
  }

  onInputChange(key, ev) {
    var update = {}
    update[key] = ev.target.value
    this.setState(update)
  }

  render() {
    return <div>
      <form onSubmit={this.onSubmit}>
        <fieldset>
          <label>Title</label>
          <input
            maxLength="640"
            type="text"
            value={this.state.title}
            onChange={this.onInputChange.bind(this, 'title')} />
        </fieldset>
        <fieldset>
          <label>Description</label>
          <input
            maxLength="640"
            type="text"
            value={this.state.description}
            onChange={this.onInputChange.bind(this, 'description')} />
        </fieldset>
        <input type="submit" value="Create" />
      </form>
    </div>
  }
}

export {
  Campaigns,
  Campaign,
  NewCampaign
}
