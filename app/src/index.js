// client entry point and application manifest
import React from 'react'
import ReactDom from 'react-dom'
import { Provider } from 'react-redux'
import { AppContainer } from 'react-hot-loader'
import { createStore, applyMiddleware, compose } from 'redux'
import thunk from 'redux-thunk'
import createHistory from 'history/createHashHistory'
import { ConnectedRouter, routerMiddleware } from 'react-router-redux'
import { createEpicMiddleware } from 'redux-observable'

import createLogger from './logger'
import { checkShellUpdate, shellMiddleware } from './shell'

import { apiClientMiddleware as robotApiMiddleware } from './robot'
import { initializeAnalytics, analyticsMiddleware } from './analytics'
import { initializeSupport, supportMiddleware } from './support'
import { startDiscovery, discoveryMiddleware } from './discovery'

import rootReducer from './reducer'
import rootEpic from './epic'

// components
import App from './components/App'

const log = createLogger(__filename)

const history = createHistory()
const epicMiddlware = createEpicMiddleware()

const middleware = applyMiddleware(
  thunk,
  epicMiddlware,
  robotApiMiddleware(),
  shellMiddleware,
  analyticsMiddleware,
  supportMiddleware,
  discoveryMiddleware,
  routerMiddleware(history)
)

const composeEnhancers =
  (window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({ maxAge: 200 })) ||
  compose

const store = createStore(rootReducer, composeEnhancers(middleware))

epicMiddlware.run(rootEpic)

const renderApp = () =>
  ReactDom.render(
    <AppContainer>
      <Provider store={store}>
        <ConnectedRouter history={history}>
          <App />
        </ConnectedRouter>
      </Provider>
    </AppContainer>,
    document.getElementById('root')
  )

if (module.hot) {
  module.hot.accept('./components/App', renderApp)
}

const { config } = store.getState()

// attach store to window if devtools are on
if (config.devtools) window.store = store

// initialize analytics and support after first render
store.dispatch(initializeAnalytics())
store.dispatch(initializeSupport())

// kickoff an initial update check at launch
store.dispatch(checkShellUpdate())

// kickoff a discovery run immediately
store.dispatch(startDiscovery())

log.info('Rendering app UI')
renderApp()
