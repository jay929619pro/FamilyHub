import { getStroke } from 'perfect-freehand'

/**
 * Transforms an array of points into an SVG path data string.
 * @param {Array<[number, number, number]>} points - Array of [x, y, pressure]
 * @param {Object} options - perfect-freehand options
 * @returns {string} SVG Path d string
 */
export function getSvgPathFromStroke(points, options = {}) {
  const stroke = getStroke(points, options)
  return getSvgPathFromStrokePoints(stroke)
}

/**
 * Helper to convert stroke points to SVG path.
 * @param {Array<[number, number]>} stroke 
 * @returns {string}
 */
function getSvgPathFromStrokePoints(stroke) {
  if (!stroke.length) return ''

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )

  d.push('Z')
  return d.join(' ')
}
