import { RoamBlock, RoamPage } from "./types"

export const isPublic = (page: Readonly<RoamPage>, publicMarkers: Array<string>) =>
  (publicMarkers.includes(page.title) || extractChildren(page).some(it => matchesMarker(it, publicMarkers)))

function matchesMarker(block: RoamBlock, markers: Array<string>) {
  const toRegex = (marker: String) => new RegExp(`#?\\[\\[${marker}]]|#${marker}`)
  const markerRegexes = markers.map(toRegex)
  return markerRegexes.some(marker => block?.string?.match(marker))
}

export const getFlatBlockList = (pages: Readonly<RoamPage | RoamBlock>[]) => pages.flatMap(extractChildren)
const extractChildren = (block: Readonly<RoamBlock | RoamPage>): Array<Readonly<RoamBlock>> =>
  block.children?.flatMap(it => [it, ...extractChildren(it)]) || []

export function getReferencedBlocks(originPages: Readonly<RoamPage>[], allPages: RoamPage[]): Readonly<RoamBlock>[] {
  const publicBlocks = getFlatBlockList(originPages)
  const referencedBlockIds =
    new Set(publicBlocks.flatMap(it => it.refs?.map(ref => ref.uid) || []))

  return getFlatBlockList(allPages).filter(it => referencedBlockIds.has(it.uid || ""))
}

export const removeChildMatching = (
  page: Readonly<RoamPage | RoamBlock>,
  privateMarkers: Array<string>,
): Readonly<RoamPage | RoamBlock> => ({
  ...page,
  children: page?.children
    ?.filter(it => !matchesMarker(it, privateMarkers))
    ?.map(it => removeChildMatching(it, privateMarkers)) as RoamBlock[],
})

export function visitChildren(
  block: Readonly<RoamPage | RoamBlock>,
  visit: (block: Readonly<RoamPage | RoamBlock>) => void,
) {
  visit(block)
  block?.children?.forEach(it => visitChildren(it, visit))
}

export function removeHierarchicalDuplicates(blocks: Readonly<RoamBlock>[]): Readonly<RoamBlock>[] {
  const nestedUids = new Set(getFlatBlockList(blocks).map(it => it.uid))

  return blocks.filter(it => !nestedUids.has(it.uid))
}
