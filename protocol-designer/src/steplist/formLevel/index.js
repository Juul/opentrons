// @flow
import {
  composeErrors,
  incompatibleAspirateLabware,
  incompatibleDispenseLabware,
  incompatibleLabware,
  pauseForTimeOrUntilTold,
  wellRatioMoveLiquid,
  type FormError,
} from './errors'
import {
  composeWarnings,
  belowPipetteMinimumVolume,
  maxDispenseWellVolume,
  minDisposalVolume,
  type FormWarning,
  type FormWarningType,
} from './warnings'
import type { StepType } from '../../form-types'

export { default as handleFormChange } from './handleFormChange'
export { default as generateNewForm } from './generateNewForm'
export { default as getDefaultsForStepType } from './getDefaultsForStepType'
export { default as getDisabledFields } from './getDisabledFields'
export { default as getNextDefaultPipetteId } from './getNextDefaultPipetteId'
export { default as stepFormToArgs } from './stepFormToArgs'

type FormHelpers = {
  getErrors?: mixed => Array<FormError>,
  getWarnings?: mixed => Array<FormWarning>,
}
const stepFormHelperMap: { [StepType]: FormHelpers } = {
  mix: {
    getErrors: composeErrors(incompatibleLabware),
    getWarnings: composeWarnings(belowPipetteMinimumVolume),
  },
  pause: { getErrors: composeErrors(pauseForTimeOrUntilTold) },
  moveLiquid: {
    getErrors: composeErrors(
      incompatibleAspirateLabware,
      incompatibleDispenseLabware,
      wellRatioMoveLiquid
    ),
    getWarnings: composeWarnings(
      belowPipetteMinimumVolume,
      maxDispenseWellVolume,
      minDisposalVolume
    ),
  },
}

export type { FormError, FormWarning, FormWarningType }

export const getFormErrors = (
  stepType: StepType,
  formData: mixed
): Array<FormError> => {
  const formErrorGetter =
    stepFormHelperMap[stepType] && stepFormHelperMap[stepType].getErrors
  const errors = formErrorGetter ? formErrorGetter(formData) : []
  return errors
}

export const getFormWarnings = (
  stepType: StepType,
  formData: mixed
): Array<FormWarning> => {
  const formWarningGetter =
    stepFormHelperMap[stepType] && stepFormHelperMap[stepType].getWarnings
  const warnings = formWarningGetter ? formWarningGetter(formData) : []
  return warnings
}
