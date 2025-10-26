import type { Group } from "konva/lib/Group"
import type { Shape } from "konva/lib/Shape"

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
export const attachImageBounds = (image: Shape) => {
  image.dragBoundFunc(pos => {
    const stage = image.getStage()
    if (!stage) return pos
    const maxX = stage.width() - image.width()
    const maxY = stage.height() - image.height()
    return {
      x: clamp(pos.x, 0, maxX),
      y: clamp(pos.y, 0, maxY)
    }
  })
}
export const attachGroupBounds = (group: Group) => {
  group.dragBoundFunc(pos => {
    const stage = group.getStage()
    if (!stage) return pos
    const rect = group.getClientRect({ skipShadow: true })
    const dx = pos.x - group.x()
    const dy = pos.y - group.y()
    const minDx = -rect.x
    const maxDx = stage.width() - (rect.x + rect.width)
    const minDy = -rect.y
    const maxDy = stage.height() - (rect.y + rect.height)
    const ndx = clamp(dx, minDx, maxDx)
    const ndy = clamp(dy, minDy, maxDy)
    return { x: group.x() + ndx, y: group.y() + ndy }
  })
}
