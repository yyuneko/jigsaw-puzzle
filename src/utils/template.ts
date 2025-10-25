import { height, width } from "../constants";
import type { MatchMode } from "../types/template";
import type { Context } from 'konva/lib/Context'

const edge = ['top', 'right', 'bottom', 'left'] as const
export type Edge = (typeof edge)[number]
export const MatchModes = Object.fromEntries(edge.map(edge => ([edge, new Array(3).fill(0).map((_, i) => ({ type: [edge, i] }))]))) as Record<Edge, MatchMode[]>

const Connect: Record<Edge, Edge> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right'
}

edge.forEach(e => {
  MatchModes[e].forEach((m, i) => {
    if (i == 0) {
      m.revert = MatchModes[Connect[e]][0]
    } else {
      m.revert = MatchModes[Connect[e]][i - 1 + 2 * (i % 2)]
    }
  })
})

// helper: draw path as continuation (convert initial moveTo into lineTo)
export function drawContinuation(ctx: Context, fn: (c: Context) => void) {
  const orig = ctx.moveTo
  ctx.moveTo = ctx.lineTo.bind(ctx)
  try { fn(ctx) } finally {
    ctx.moveTo = orig
  }
}

const fromTopTo: Record<Exclude<Edge, 'top'>, (path: MatchMode["path"]) => MatchMode["path"]> = {
  bottom: path => (ctx) => {
    ctx.save()
    ctx.rotate(Math.PI)
    ctx.translate(-width, -height)
    drawContinuation(ctx, path)
    ctx.restore()
  },
  right: path => (ctx) => {
    ctx.save()
    ctx.rotate(Math.PI / 2)
    ctx.translate(0, -width)
    drawContinuation(ctx, path)
    ctx.restore()
  },
  left: path => (ctx) => {
    ctx.save()
    ctx.rotate(-Math.PI / 2)
    ctx.translate(-height, 0)
    drawContinuation(ctx, path)
    ctx.restore()
  }
}

/**
 * 上：直线
 */
MatchModes.top[0].path = (topLine) => {
  topLine.moveTo(0, 0)
  topLine.lineTo(width, 0)
}

/**
 * 上：凸
 */
MatchModes.top[1].path = (topConvex) => {
  topConvex.moveTo(0, 0)
  topConvex.lineTo(width / 4, 0)
  topConvex.arc(width / 2, 0, width / 4, Math.PI, 0, false)
  topConvex.lineTo(width, 0)
}

/**
 * 上：凹
 */
MatchModes.top[2].path = (topConcave) => {
  topConcave.moveTo(0, 0)
  topConcave.lineTo(width / 4, 0)
  topConcave.arc(width / 2, 0, width / 4, Math.PI, 0, true)
  topConcave.lineTo(width, 0)
}

(['right', 'bottom', 'left'] as const).forEach(e => {
  MatchModes[e].forEach((m, i) => {
    m.path = fromTopTo[e](MatchModes.top[i].path)
  })
})