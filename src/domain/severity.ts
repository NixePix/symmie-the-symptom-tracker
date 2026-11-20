/** Colour for a strength value 1-10: hue 170 (teal) at 1 down to 0 (red) at 10, as in prototype-b's `sev`. */
export const severityColor = (value: number): string => `hsl(${Math.round(170 - ((value - 1) / 9) * 170)} 92% 56%)`
