import type { Template } from "./template";

export interface Img {
  id: string;
  row: number;
  col: number;
  template: Template
}

export interface Fragment extends Img {
  groupId?: string;
}
