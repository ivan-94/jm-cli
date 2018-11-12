/**
 * App Root Component
 */
import React from 'react'
import { hot } from 'react-hot-loader'
import { log } from '~/utils'

export class App extends React.Component<{}, {}> {
  public componentDidMount() {
    log('mounted')
  }
  public render() {
    return <div>App</div>
  }
}

export default hot(module)(App)
