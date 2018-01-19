// @flow
// robot selectors
import padStart from 'lodash/padStart'
import {createSelector} from 'reselect'

import type {State as CalibrationState} from './reducer/calibration'
import type {State as ConnectionState} from './reducer/connection'
import type {State as SessionState} from './reducer/session'

import {
  type ConnectionStatus,
  type SessionStatus,
  type InstrumentMount,
  _NAME,
  UNPROBED,
  PREPARING_TO_PROBE,
  READY_TO_PROBE,
  PROBING,
  PROBED,
  UNCONFIRMED,
  INSTRUMENT_AXES,
  DECK_SLOTS
} from './constants'

type State = {
  robot: {
    calibration: CalibrationState,
    connection: ConnectionState,
    session: SessionState
  }
}
const calibration = (state: State): CalibrationState => state[_NAME].calibration

const connection = (state: State): ConnectionState => state[_NAME].connection

const session = (state: State): SessionState => state[_NAME].session
const sessionRequest = (state: State) => session(state).sessionRequest
const sessionStatus = (state: State) => session(state).state

export function getIsScanning (state: State): boolean {
  return connection(state).isScanning
}

export const getDiscovered = createSelector(
  (state: State) => connection(state).discovered,
  (state: State) => connection(state).discoveredByName,
  (state: State) => connection(state).connectedTo,
  (discovered, discoveredByName, connectedTo) => discovered.map((name) => ({
    ...discoveredByName[name],
    isConnected: connectedTo === name
  }))
)

export const getConnectionStatus = createSelector(
  (state: State) => connection(state).connectedTo,
  (state: State) => connection(state).connectRequest.inProgress,
  (state: State) => connection(state).disconnectRequest.inProgress,
  (connectedTo, isConnecting, isDisconnecting): ConnectionStatus => {
    if (!connectedTo && isConnecting) return 'connecting'
    if (connectedTo && !isDisconnecting) return 'connected'
    if (connectedTo && isDisconnecting) return 'disconnecting'

    return 'disconnected'
  }
)

export function getUploadInProgress (state: State) {
  return sessionRequest(state).inProgress
}

export function getUploadError (state: State): ?{message: string} {
  return sessionRequest(state).error
}

export function getSessionName (state: State): string {
  return session(state).name
}

export function getSessionIsLoaded (state: State): boolean {
  return sessionStatus(state) !== ('': SessionStatus)
}

export function getIsReadyToRun (state: State): boolean {
  return sessionStatus(state) === ('loaded': SessionStatus)
}

export function getIsRunning (state: State): boolean {
  const status = sessionStatus(state)

  return (
    status === ('running': SessionStatus) ||
    status === ('paused': SessionStatus)
  )
}

export function getIsPaused (state: State): boolean {
  return sessionStatus(state) === ('paused': SessionStatus)
}

export function getIsDone (state: State): boolean {
  const status = sessionStatus(state)

  return (
    status === ('error': SessionStatus) ||
    status === ('finished': SessionStatus) ||
    status === ('stopped': SessionStatus)
  )
}

// helper function for getCommands selector
function traverseCommands (commandsById, parentIsCurrent) {
  return function mapIdToCommand (id, index, commands) {
    const {description, handledAt, children} = commandsById[id]
    const next = commandsById[commands[index + 1]]
    const isCurrent = (
      parentIsCurrent &&
      handledAt != null &&
      (next == null || next.handledAt == null)
    )
    const isLast = isCurrent && !children.length

    return {
      id,
      description,
      handledAt,
      isCurrent,
      isLast,
      children: children.map(traverseCommands(commandsById, isCurrent))
    }
  }
}

export const getCommands = createSelector(
  (state: State) => session(state).protocolCommands,
  (state: State) => session(state).protocolCommandsById,
  (commands, commandsById) => commands.map(traverseCommands(commandsById, true))
)

export const getRunProgress = createSelector(
  getCommands,
  (commands): number => {
    const leaves = commands.reduce(countLeaves, {handled: 0, total: 0})

    return leaves.total && ((leaves.handled / leaves.total) * 100)

    function countLeaves (result, command) {
      let {handled, total} = result

      if (command.children.length) {
        return command.children.reduce(countLeaves, result)
      }

      if (command.handledAt) handled++
      total++

      return {handled, total}
    }
  }
)

// TODO(mc, 2018-01-04): inferring start time from handledAt of first command
// is inadequate; robot starts moving before this timestamp is set
export const getStartTime = createSelector(
  getCommands,
  (commands): ?number => commands.length
    ? commands[0].handledAt
    : null
)

export const getRunTime = createSelector(
  getStartTime,
  (state: State) => session(state).runTime,
  (startTime: ?number, runTime: ?number): string => {
    // TODO(mc, 2018-01-04): gt check is required because of the TODO above
    const runTimeSeconds = (runTime && startTime && runTime > startTime)
      ? Math.floor((runTime - startTime) / 1000)
      : 0

    const hours = padStart(`${Math.floor(runTimeSeconds / 3600)}`, 2, '0')
    const minutes = padStart(`${Math.floor(runTimeSeconds / 60) % 60}`, 2, '0')
    const seconds = padStart(`${runTimeSeconds % 60}`, 2, '0')

    return `${hours}:${minutes}:${seconds}`
  }
)

export function getInstrumentsByAxis (state: State) {
  return session(state).protocolInstrumentsByAxis
}

export const getInstruments = createSelector(
  getInstrumentsByAxis,
  (state: State) => calibration(state).probedByAxis,
  (state: State) => calibration(state).calibrationRequest,
  (instrumentsByMount, probedByMount, calibrationRequest) => {
    return INSTRUMENT_AXES.map((mount) => {
      const instrument = instrumentsByMount[mount]
      if (!instrument || !instrument.name) return {axis: mount}

      let calibration = UNPROBED

      // TODO(mc: 2018-01-10): rethink the instrument level "calibration" prop
      if (calibrationRequest.mount === mount && !calibrationRequest.error) {
        if (calibrationRequest.type === 'MOVE_TO_FRONT') {
          calibration = calibrationRequest.inProgress
            ? PREPARING_TO_PROBE
            : READY_TO_PROBE
        } else if (calibrationRequest.type === 'PROBE_TIP') {
          calibration = calibrationRequest.inProgress
            ? PROBING
            : PROBED
        }
      }

      return {
        ...instrument,
        calibration,
        probed: probedByMount[mount] || false
      }
    })
  }
)

// returns the mount of the pipette to use for deckware calibration
// TODO(mc, 2018-01-03): select pipette based on deckware props
export const getCalibratorMount = createSelector(
  getInstruments,
  (instruments): InstrumentMount | '' => {
    const single = instruments.find((i) => i.channels && i.channels === 1)
    const multi = instruments.find((i) => i.channels && i.channels > 1)

    const calibrator = single || multi || {axis: ''}

    return calibrator.axis
  }
)

export const getInstrumentsCalibrated = createSelector(
  getInstruments,
  (instruments): boolean => instruments.every((i) => !i.name || i.probed)
)

export function getLabwareBySlot (state: State) {
  return session(state).protocolLabwareBySlot
}

export const getLabware = createSelector(
  getLabwareBySlot,
  (state: State) => calibration(state).labwareBySlot,
  (state: State) => calibration(state).confirmedBySlot,
  (labwareBySlot, statusBySlot, confirmedBySlot) => {
    return DECK_SLOTS
      .map((slot) => {
        const labware = labwareBySlot[slot]

        if (!labware) return {slot}

        return {
          ...labware,
          calibration: statusBySlot[slot] || UNCONFIRMED,
          confirmed: confirmedBySlot[slot] || false
        }
      })
  }
)

export function getDeckPopulated (state: State) {
  return calibration(state).deckPopulated
}

export const getUnconfirmedLabware = createSelector(
  getLabware,
  (labware) => labware.filter((lw) => lw.type && !lw.confirmed)
)

export const getUnconfirmedTipracks = createSelector(
  getUnconfirmedLabware,
  (labware) => labware.filter((lw) => lw.type && lw.isTiprack)
)

export const getNextLabware = createSelector(
  getUnconfirmedTipracks,
  getUnconfirmedLabware,
  (tipracks, labware) => tipracks[0] || labware[0]
)

export const getTipracksConfirmed = createSelector(
  getUnconfirmedTipracks,
  (remaining): boolean => remaining.length === 0
)

export const getLabwareConfirmed = createSelector(
  getUnconfirmedLabware,
  (remaining): boolean => remaining.length === 0
)

export function getJogInProgress (state: State): boolean {
  return calibration(state).jogRequest.inProgress
}

export function getOffsetUpdateInProgress (state: State): boolean {
  return calibration(state).updateOffsetRequest.inProgress
}

export function getJogDistance (state: State): number {
  return calibration(state).jogDistance
}