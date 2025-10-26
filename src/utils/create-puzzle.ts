import { height, width } from "../constants";
import type { Img } from "../types/img"
import type { MatchMode, Template } from "../types/template";
import { MatchModes } from "./template";
import { Bezier, type Point } from 'bezier-js'
import {v7 as uuid} from 'uuid'
function randomBetween(a: number, b: number) {
  return Math.floor(a + Math.random() * (b - a))
}

function getPointsOnLine(start: Point, end: Point, pointCnt: number) {
  const points: Point[] = []
  const k = (start.y - end.y) / (start.x - end.x)
  const c = start.y - k * start.x
  for (let i = 0; i < pointCnt; i++) {
    const x = start.x + Math.floor(Math.random() * (end.x - start.x))
    const y = Math.floor(k * x + c)
    points.push({ x, y })
  }
  return [...points, end]
}

function getBezier() {
  const start = { x: width, y: height }
  const end = { x: 0, y: height }
  let points: Point[] = []
  if (Math.random() > 0.5) {
    let p = start
    const l1 = getPointsOnLine(p, { x: randomBetween(end.x + width / 2, p.x - width / 4), y: randomBetween(p.y - height / 2, p.y + height / 2) }, randomBetween(0, 3))
    p = l1[l1.length - 1]
    const l2 = getPointsOnLine(p, { x: randomBetween(end.x + width / 2, start.x), y: randomBetween(start.y, start.y + height / 2) }, randomBetween(0, 3))
    p = { x: randomBetween(end.x + width / 4, start.x - width / 2), y: randomBetween(end.y - height / 2, end.y + height / 2) }
    const l5 = getPointsOnLine(p, end, randomBetween(0, 3))
    const p1 = { x: randomBetween(end.x + width / 4, l2[l2.length - 1].x - width / 2), y: randomBetween(end.y, end.y + height / 2) }
    const l4 = getPointsOnLine(p1, p, randomBetween(0, 3))
    p = l2[l2.length - 1]
    const l3 = getPointsOnLine(p, p1, randomBetween(0, 3))
    points = [start, ...l1, ...l2, ...l3, ...l4, ...l5];
  } else {
    let p = start
    const l1 = getPointsOnLine(p, { x: randomBetween(end.x + width / 2, p.x - width / 4), y: randomBetween(p.y - height / 2, p.y + height / 2) }, randomBetween(0, 3))
    p = l1[l1.length - 1]
    const l2 = getPointsOnLine(p, { x: randomBetween(end.x + width / 2, start.x), y: randomBetween(start.y, start.y - height / 2) }, randomBetween(0, 3))
    p = { x: randomBetween(end.x + width / 4, start.x - width / 2), y: randomBetween(end.y - height / 2, end.y + height / 2) }
    const l5 = getPointsOnLine(p, end, randomBetween(0, 3))
    const p1 = { x: randomBetween(end.x + width / 4, l2[l2.length - 1].x - width / 2), y: randomBetween(end.y, end.y - height / 2) }
    const l4 = getPointsOnLine(p1, p, randomBetween(0, 3))
    p = l2[l2.length - 1]
    const l3 = getPointsOnLine(p, p1, randomBetween(0, 3))
    points = [start, ...l1, ...l2, ...l3, ...l4, ...l5];
  }
  return points
}

/**
 * 生成拼图
 * @param originImg 原图
 * @param rowCnt 行数
 * @param colCnt 列数
 * @returns 拼图碎片数组，包括图片元素、所在行列
 */
export function generatePuzzle(rowCnt: number, colCnt: number): Img[] {
  const imgs: Img[] = []
  for (let row = 0; row < rowCnt; row++) {
    for (let col = 0; col < colCnt; col++) {
      const template: Template = {
        top: MatchModes.top[0],
        right: MatchModes.right[0],
        bottom: MatchModes.bottom[0],
        left: MatchModes.left[0]
      }
      if (row !== rowCnt - 1) {
        const bottom = {} as MatchMode;
        const curve = new Bezier(getBezier());

        // 获取曲线上的点
        const lut = curve.getLUT(100); // 100个点
        bottom.path = ctx => {
          lut.forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
        }
        bottom.revert = {
          path: ctx => {
            const reverseLut = [...lut].reverse().map(point => ({ ...point, y: point.y - height }))
            ctx.moveTo(reverseLut[0].x, reverseLut[0].y);
            reverseLut.forEach(point => {
              ctx.lineTo(point.x, point.y);
            });
          },
          revert: bottom
        }
        template.bottom = bottom
      }
      if (row !== 0) {
        template.top = imgs[(row - 1) * colCnt + col].template.bottom.revert
      }
      if (col !== colCnt - 1) {
        const right = {} as MatchMode;
        const curve = new Bezier(getBezier().map(p => ({ x: p.y / height * width, y: (width - p.x) / width * height })));
        // 获取曲线上的点
        const lut = curve.getLUT(100); // 100个点
        right.path = ctx => {
          lut.forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
        }
        right.revert = {
          path: ctx => {
            const reverseLut = [...lut].reverse().map(point => ({ ...point, x: point.x - width }))
            reverseLut.forEach(point => {
              ctx.lineTo(point.x, point.y);
            });
          },
          revert: right
        }
        template.right = right
      }
      if (col !== 0) {
        template.left = imgs[row * colCnt + col - 1].template.right.revert;
      }
      imgs.push({ id: uuid(), row, col, template })
    }
  }
  return imgs
}

export const waitImage = async (img: HTMLImageElement) => {
  if (img.complete && img.naturalWidth > 0) return
  if ('decode' in img && typeof img.decode === 'function') {
    try { await img.decode() } catch { /* ignore */ }
    return
  }
  await new Promise<void>((resolve) => {
    const onLoad = () => { cleanup(); resolve() }
    const onError = () => { cleanup(); resolve() }
    const cleanup = () => {
      img.removeEventListener('load', onLoad)
      img.removeEventListener('error', onError)
    }
    img.addEventListener('load', onLoad)
    img.addEventListener('error', onError)
  })
}