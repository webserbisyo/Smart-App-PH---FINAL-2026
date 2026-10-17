import type { CSSProperties } from 'react'

export type CssVariableKey = `--${string}`
export type CssVariableValue = string | number | undefined

export type CssVarsObject = {
  [K in CssVariableKey]?: CssVariableValue
}

export function cssVars(variables: CssVarsObject): CSSProperties {
  const result: CSSProperties = {}
  Object.assign(result, variables)
  return result
}
