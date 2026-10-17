declare function cssVars(vars: Record<string, string>): Record<string, string>

export function ValidStyle() {
  return <div style={cssVars({ '--brand': 'blue' })}>test</div>
}
