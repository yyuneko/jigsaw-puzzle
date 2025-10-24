import type { Context } from "konva/lib/Context";
import { type Edge } from "../utils/template";

export interface MatchMode {
  revert: MatchMode;
  type: [Edge, number];
  path: (p: Context) => void;
  readonly inset: number;
}
export interface Template {
  left: MatchMode;
  right: MatchMode;
  top: MatchMode;
  bottom: MatchMode;
}

export const clip = (ctx: Context, temp: Template) => {
  ctx.beginPath()
  temp.top.path(ctx)
  temp.right.path(ctx)
  temp.bottom.path(ctx)
  temp.left.path(ctx)
  ctx.closePath()
}