import { height, width } from "../constants";
import type { MatchMode } from "../types/template";

const edge = ['top', 'right', 'bottom', 'left'] as const
export type Edge = (typeof edge)[number]
export const MatchModes = Object.fromEntries(edge.map(edge => ([edge, new Array(3).fill(0).map((_, i) => ({ type: [edge, i] }))]))) as Record<Edge, MatchMode[]>

/**
 * 上：直线
 */
MatchModes.top[0].path = (topLine) => {
  topLine.moveTo(0, 0)
  topLine.lineTo(width, 0)
}
MatchModes.top[0].revert = MatchModes.bottom[0]

/**
 * 上：凸
 */
MatchModes.top[1].path = (topConvex) => {
  topConvex.moveTo(0, 0)
  topConvex.lineTo(width / 4, 0)
  topConvex.arc(width / 2, 0, width / 4, Math.PI, 0, false)
  topConvex.lineTo(width, 0)
}
MatchModes.top[1].revert = MatchModes.bottom[2]

/**
 * 上：凹
 */
MatchModes.top[2].path = (topConcave) => {
  topConcave.moveTo(0, 0)
  topConcave.lineTo(width / 4, 0)
  topConcave.arc(width / 2, 0, width / 4, Math.PI, 0, true)
  topConcave.lineTo(width, 0)
}
MatchModes.top[2].revert = MatchModes.bottom[1]
/**
 * 右：直线
 */

MatchModes.right[0].path = (rightLine) => {
  rightLine.lineTo(width, height)
}
MatchModes.right[0].revert = MatchModes.left[0]
/**
 * 右：凸
 */
MatchModes.right[1].path = (rightConvex) => {
  rightConvex.lineTo(width, height / 4)
  rightConvex.arc(width, height / 2, height / 4, Math.PI / 2 * 3, Math.PI / 2, false)
  rightConvex.lineTo(width, height)
}
MatchModes.right[1].revert = MatchModes.left[2]
/**
 * 右：凹
 */
MatchModes.right[2].path = (rightConcave) => {
  rightConcave.lineTo(width, height / 4)
  rightConcave.arc(width, height / 2, height / 4, Math.PI / 2 * 3, Math.PI / 2, true)
  rightConcave.lineTo(width, height)
}
MatchModes.right[2].revert = MatchModes.left[1]
/**
 * 下：直线
 */

MatchModes.bottom[0].path = bottomLine => {
  bottomLine.lineTo(0, height)
}
MatchModes.bottom[0].revert = MatchModes.top[0]
/**
 * 下：凸
 */
MatchModes.bottom[1].path = bottomConvex => {
  bottomConvex.lineTo(width / 4 * 3, height)
  bottomConvex.arc(width / 2, height, width / 4, Math.PI, 0, true)
  bottomConvex.lineTo(0, height)
}
MatchModes.bottom[1].revert = MatchModes.top[2]
/**
 * 下：凹
 */
MatchModes.bottom[2].path = bottomConcave => {
  bottomConcave.lineTo(width / 4 * 3, height)
  bottomConcave.arc(width / 2, height, width / 4, 0, Math.PI, true)
  bottomConcave.lineTo(0, height)
}
MatchModes.bottom[2].revert = MatchModes.top[1]
/**
 * 左：直线
 */

MatchModes.left[0].path = leftLine => {
  leftLine.lineTo(0, height)
}
MatchModes.left[0].revert = MatchModes.right[0]
/**
 * 左：凸
 */
MatchModes.left[1].path = leftConvex => {
  leftConvex.lineTo(0, height / 4)
  leftConvex.arc(0, height / 2, height / 4, Math.PI / 2 * 3, Math.PI / 2, true)
  leftConvex.lineTo(0, height)
}
MatchModes.left[1].revert = MatchModes.right[2]
/**
 * 左：凹
 */
MatchModes.left[2].path = leftConcave => {
  leftConcave.lineTo(0, height / 4 * 3)
  leftConcave.arc(0, height / 2, height / 4, Math.PI / 2, Math.PI / 2 * 3, true)
  leftConcave.lineTo(0, 0)
}
MatchModes.left[2].revert = MatchModes.right[1]