import React from 'react'
import ReactDOM from 'react-dom'
import { log } from '@src/utils/common'
import 'css/a.css'

export default class H extends React.Component<{}, {}> {
  public componentDidMount() {
    log('hi')
  }

  public render() {
    return <div>hello</div>
  }
}

ReactDOM.render(<H />, document.body)
