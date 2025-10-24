import { type KonvaNodeEvents } from "react-konva";

export interface Img {
  src: HTMLImageElement;
  row: number;
  col: number;
}

export interface Fragment extends Img {
  x: number;
  y: number;
  groupId?: string;
}

export interface FragmentGroup {
  id: string;
  children: Fragment[]
}


export type Stage = NonNullable<ReturnType<Parameters<NonNullable<KonvaNodeEvents['onDragEnd']>>[0]['target']['getStage']>>
export type Shape = Exclude<Parameters<NonNullable<KonvaNodeEvents['onDragEnd']>>[0]['target'], Stage>
export type Group = Exclude<ReturnType<NonNullable<ReturnType<Parameters<NonNullable<KonvaNodeEvents['onDragEnd']>>[0]['target']['getLayer']>>['getChildren']>[0], Shape>