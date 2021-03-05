export interface RoamPage {
  title: string
  children?: RoamBlock[]
  "create-time"?: number
  "create-email"?: string
  "edit-time"?: number
  "edit-email"?: string
  uid: string
}

export interface RoamBlock {
  string: string
  uid?: string
  children?: RoamBlock[]
  "create-time"?: number
  "create-email"?: string
  "edit-time"?: number
  "edit-email"?: string
  heading?: 0 | 1 | 2 | 3
  "text-align"?: "left" | "center" | "right" | "justify"
  refs?: Ref[]
  ":block/refs"?: DRef[]
}

export interface Ref {
  uid: string
}

export interface DRef {
  ":block/uid": string
}
