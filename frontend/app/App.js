import React, { Component } from 'react'
import { Router, Route, Link, IndexRoute, browserHistory } from 'react-router'
import NotificationSystem from 'react-notification-system'
import { Campaigns, Campaign, NewCampaign } from './Campaign'
import { NewUpdate, NewCampaignCall } from './Conversation'
import RequireAuthenticationContainer from './RequireAuthenticationContainer'
import Login from './Login'
import API from './API'

function logout() {
  window.localStorage.removeItem('callparty_session_token')
  browserHistory.push('/login')
}
function refreshReps(e) {
  e.preventDefault()
  API.updateReps()
}

const Container = (props) => {
  const logoutButton = props.location.pathname !== '/login' ? <a onClick={logout} href=""><button>Sign Out</button></a> : null

  const refreshButton = props.location.pathname !== '/login' ? <a onClick={refreshReps} href=""><button className="warn">Refresh Rep Data</button></a> : null

  return <div>
    <header className="main-header">
      <Link to="/">CallParty</Link>
      <div className="main-header-nav">
        {refreshButton}
        {logoutButton}
      </div>
    </header>
    {props.children}
  </div>
}

const NotFound = () => <h1>404.. This page is not found!</h1>

class App extends Component {
  static get childContextTypes() {
    return { notify: React.PropTypes.func }
  }

  getChildContext() {
    return {
      notify: this.notify.bind(this),
    }
  }

  notify(notification) {
    this.notifications.addNotification(notification)
  }

  render() {
    return (
      <main>
        <NotificationSystem ref={notifications => { this.notifications = notifications }} style={false} />
        <Router history={browserHistory}>
          <Route path="/" component={Container}>
            <Route path="login" component={Login} />
            <Route component={RequireAuthenticationContainer}>
              <IndexRoute component={Campaigns} />
              <Route path="new" component={NewCampaign} />
              <Route path=":id" component={Campaign} />
              <Route path=":id/call/new" component={NewCampaignCall} />
              <Route path=":id/update/new" component={NewUpdate} />
            </Route>
          </Route>
          <Route path="*" component={NotFound} />
        </Router>
      </main>
    )
  }
}

export default App
