import { height, width } from "../constants";
import type { Fragment, Img } from "../types/img";
import type { Shape } from "konva/lib/Shape";
export function canBeMerged(img1: Img, img2: Img): boolean {
  return (
    img1.row === img2.row && Math.abs(img1.col - img2.col) === 1
    || img1.col === img2.col && Math.abs(img1.row - img2.row) === 1
  )
}

export function findClosest(img: Shape, all: Shape[], imgMap: Record<string, Fragment>) {
  const curFragment = imgMap[img.attrs.fillPatternImage.src];
  let shape: Shape | undefined;
  all.forEach(v => {
    const otherFragment = imgMap[v.attrs.fillPatternImage.src]
    if (!canBeMerged(curFragment, otherFragment)) return;
    if (Math.abs((v.getAbsolutePosition().x + width * (curFragment.col - otherFragment.col) - img.getAbsolutePosition().x)) <= 10
      && Math.abs(v.getAbsolutePosition().y + height * (curFragment.row - otherFragment.row) - img.getAbsolutePosition().y) <= 10) {
      shape = v;
    }
  })
  return shape;
}