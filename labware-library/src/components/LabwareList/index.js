// @flow
// main LabwareList component
import * as React from 'react'

import { getAllDefinitions } from '../../definitions'
import { FILTER_OFF } from '../../filters'
import LabwareCard from './LabwareCard'
import NoResults from './NoResults'
import styles from './styles.css'

import type { FilterParams } from '../../types'

const filterMatches = (filter: ?string, value: string): boolean =>
  !filter || filter === FILTER_OFF || filter === value

export type LabwareListProps = {
  filters: FilterParams,
}

export { default as NoResults } from './NoResults'
export { default as LabwareGallery } from './LabwareGallery'
export { default as LoadName } from './LoadName'
export { default as Tags } from './Tags'

export default function LabwareList(props: LabwareListProps) {
  const { category, manufacturer } = props.filters
  const definitions = getAllDefinitions().filter(
    d =>
      filterMatches(category, d.metadata.displayCategory) &&
      filterMatches(manufacturer, d.brand.brand)
  )

  return definitions.length === 0 ? (
    <NoResults />
  ) : (
    <ul className={styles.list}>
      {definitions.map(d => (
        <LabwareCard key={d.otId} definition={d} />
      ))}
    </ul>
  )
}
