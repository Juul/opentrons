// @flow
import type { DeckDefinition } from '@opentrons/shared-data'

// TODO: Brian 2019-05-01 very similar to getAllDefinitions in labware-library,
// and PD labware-def utils should reconcile differences & make a general util
// fn imported from shared-data, but this relies on a webpack-specific method,
// and SD is not webpacked

// require all definitions in the definitions2 directory
// $FlowFixMe: require.context is webpack-specific method
const deckDefinitionsContext = require.context(
  '@opentrons/shared-data/robot-data/decks',
  true, // traverse subdirectories
  /\.json$/, // import filter
  'sync' // load every definition into one synchronous chunk
)

export function getDeckDefinitions(): { [string]: DeckDefinition } {
  const deckDefinitions = deckDefinitionsContext
    .keys()
    .reduce((acc, filename) => {
      const def = deckDefinitionsContext(filename)
      return { ...acc, [def.otId]: def }
    }, {})

  return deckDefinitions
}
