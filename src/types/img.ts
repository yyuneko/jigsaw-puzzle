export interface Img {
  src: HTMLImageElement;
  row: number;
  col: number;
}

export interface Fragment extends Img {
  groupId?: string;
}
