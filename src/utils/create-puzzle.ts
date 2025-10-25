import type { Img } from "../types/img"
import type { Template } from "../types/template";
import { MatchModes } from "./template";

/**
 * 生成拼图
 * @param originImg 原图
 * @param rowCnt 行数
 * @param colCnt 列数
 * @returns 拼图碎片数组，包括图片元素、所在行列
 */
export function generatePuzzle(originImg: string, rowCnt: number, colCnt: number): Img[] {
  const imgs: Img[] = []
  for (let row = 0; row < rowCnt; row++) {
    for (let col = 0; col < colCnt; col++) {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = `https://dummyimage.com/50x50/000/fff&text=${encodeURIComponent(`${row}, ${col}`)}`
      const template: Template = {
        top: MatchModes.top[0],
        right: MatchModes.right[0],
        bottom: MatchModes.bottom[0],
        left: MatchModes.left[0]
      }
      if (row !== rowCnt - 1) {
        template.bottom = MatchModes.bottom[Math.random() > 0.5 ? 2 : 1];
      }
      if (row !== 0) {
        template.top = imgs[(row - 1) * colCnt + col].template.bottom.revert
      }
      if (col !== colCnt - 1) {
        template.right = MatchModes.right[Math.random() > 0.5 ? 2 : 1]
      }
      if (col !== 0) {
        template.left = imgs[row * colCnt + col - 1].template.right.revert;
      }
      imgs.push({ src: image, row, col, template })
    }
  }
  return imgs
}