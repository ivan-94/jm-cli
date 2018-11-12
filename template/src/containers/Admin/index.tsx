/**
 * Admin Root Component
 */
import React from 'react'
import { hot } from 'react-hot-loader'

export class App extends React.Component<{}, {}> {
  public render() {
    return <div>Admin</div>
  }
}

export default hot(module)(App)
