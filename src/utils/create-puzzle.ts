import type { Img } from "../types/img"

export function generatePuzzle(originImg: string, rowCnt: number, colCnt: number): Img[] {
  const imgs: Img[] = []
  for (let i = 0; i < colCnt; i++) {
    imgs.push(...new Array(rowCnt).fill(0).map((_, j) => {
      const image = new Image();
      image.src = `https://dummyimage.com/50x50/000/fff&text=${encodeURIComponent(`${j}, ${i}`)}`
      return ({ src: image, row: i, col: j })
    }))
  }
  return imgs
}