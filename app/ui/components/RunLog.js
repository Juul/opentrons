import React, {Component} from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import styles from './RunLog.css'

export default class RunLog extends Component {
  componentDidUpdate () {
    if (this.refs.ensureVisible) this.refs.ensureVisible.scrollIntoView(true)
  }

  render () {
    const { style, commands } = this.props
    // hardcoded nested commands for style updates
    const nestedCommands =
      [
        {
          id: 0,
          description: 'foo',
          handledAt: '2017-08-30T12:00:00Z',
          isCurrent: true,
          children: [
            {
              id: 1,
              description: 'bar',
              handledAt: '2017-08-30T12:00:01Z',
              isCurrent: true,
              children: [
                {
                  id: 2,
                  description: 'baz',
                  handledAt: '2017-08-30T12:00:02Z',
                  isCurrent: true,
                  children: []
                },
                {
                  id: 3,
                  description: 'qux',
                  handledAt: '',
                  isCurrent: false,
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 4,
          description: 'fizzbuzz',
          handledAt: '',
          isCurrent: false,
          children: []
        }
      ]
    const commandItems = nestedCommands.map((command) => {
      const {id, isCurrent, description} = command
      const props = {
        key: id,
        className: classnames({[styles.current]: isCurrent})
      }
      // TODO: add ability to turn autoscroll on and off
      if (isCurrent) props.ref = 'ensureVisible'

      return (<p {...props}>[{id}] : {description}</p>)
    })
    return (
      <section className={classnames(style, styles.run_log_wrapper)}>
        {commandItems}
      </section>
    )
  }
}

/*
Commenting out isRequired for some props for now, using local mock data for first pass
*/
RunLog.propTypes = {
  style: PropTypes.string,
  isConnected: PropTypes.bool.isRequired,
  // TODO(mc, 2017-08-23): use PropTypes.shape (or whatever that method is)
  // instead of object
  commands: PropTypes.arrayOf(PropTypes.object).isRequired
}
