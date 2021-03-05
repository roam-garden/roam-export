import * as _ from "lodash"
import { truthy } from "./utils"
import { RoamBlock, RoamPage } from "./types"

// TODO: consider adding StartsWith as in https://github.com/dvargas92495/generate-roam-site-action
// TODO: add option to toggle whether we pull in referenced blocks or exclude them
export interface Filter {
  makePagesWithTheseTagsPublic: Array<string>
  makeBlocksWithTheseTagsPrivate: Array<string>
}


const isPublic = (page: Readonly<RoamPage>, publicMarkers: Array<string>) =>
  (publicMarkers.includes(page.title) || extractChildren(page).some(it => matchesMarker(it, publicMarkers)))

function matchesMarker(block: RoamBlock, markers: Array<string>) {
  const toRegex = (marker: String) => new RegExp(`#?\\[\\[${marker}]]|#${marker}`)
  const markerRegexes = markers.map(toRegex)
  return markerRegexes.some(marker => block?.string?.match(marker))
}

const getFlatBlockList = (pages: Readonly<RoamPage>[]) => pages.flatMap(extractChildren)

const extractChildren = (block: Readonly<RoamBlock | RoamPage>): Array<Readonly<RoamBlock>> =>
  block.children?.flatMap(it => [it, ...extractChildren(it)]) || []


function getReferencedBlocks(originPages: Readonly<RoamPage>[], allPages: RoamPage[]): Readonly<RoamBlock>[] {
  const publicBlocks = getFlatBlockList(originPages)
  const referencedBlockIds =
    new Set(publicBlocks.flatMap(it => it.refs?.map(ref => ref.uid) || []))

  return getFlatBlockList(allPages).filter(it => referencedBlockIds.has(it.uid || ""))
}


const removeChildMatching = (
  page: Readonly<RoamPage | RoamBlock>,
  privateMarkers: Array<string>,
): Readonly<RoamPage | RoamBlock> => ({
  ...page,
  children: page?.children
    ?.filter(it => !matchesMarker(it, privateMarkers))
    ?.map(it => removeChildMatching(it, privateMarkers)) as RoamBlock[],
})


function visitChildren(
  block: Readonly<RoamPage | RoamBlock>,
  visit: (block: Readonly<RoamPage | RoamBlock>) => void,
) {
  visit(block)
  block?.children?.forEach(it => visitChildren(it, visit))
}

export class RoamJson {
  readonly blockToPage = new Map()
  readonly pageByName: Map<string, Readonly<RoamPage>>
  readonly pageByUid: Map<string, Readonly<RoamPage>>
  orphanId = 0

  constructor(
    readonly allPages: Readonly<RoamPage>[],
    readonly filter: Filter,
    readonly createOrphansForBacklinks = true,
  ) {

    this.buildBlockToPageMap()
    this.pageByName = new Map(allPages.map(it => [it.title, it]))
    this.pageByUid = new Map(allPages.map(it => [it.uid, it]))
  }

  getPagesToRender() {
    const pagesWithoutPrivateBlocks = this.removePrivateBlocks(this.allPages) as RoamPage[]
    const publicPages = this.findPublicPages(pagesWithoutPrivateBlocks)


    const referencedBlocks = getReferencedBlocks(publicPages, pagesWithoutPrivateBlocks)
    console.log(`${referencedBlocks.length} blocks referenced by other blocks`)

    const pagesWithBlocks = [...publicPages, ...this.createOrphanPagesWithBlocks(publicPages, referencedBlocks)]

    console.log(`There is ${pagesWithBlocks.length} pages with blocks`)

    const { blocksReferencingPages, referencedPages } = this.buildBlocksReferencingPages(pagesWithBlocks)
    const pagesToRender = this.createOrphansForBacklinks ?
      [...pagesWithBlocks, ...this.createOrphansWithReferences(pagesWithBlocks, referencedPages)] :
      pagesWithBlocks

    const blockUidsToRender = new Set([...referencedBlocks, ...blocksReferencingPages].map(it => it.uid))
    console.log(`${blockUidsToRender.size} blocks to separately render`)

    return {
      pages: pagesToRender,
      blockUidsToRender,
    }
  }

  private createOrphanPagesWithBlocks(
    publicPages: Readonly<RoamPage>[],
    referencedBlocks: Readonly<RoamBlock>[],
  ) {
    const allPublicBlocks = new Set(getFlatBlockList(publicPages))

    const orphanBlocks = referencedBlocks.filter(it => !allPublicBlocks.has(it))

    console.log(`${orphanBlocks.length + allPublicBlocks.size} total blocks to make public`)

    return this.buildOrphanPages(orphanBlocks)
  }

  private createOrphansWithReferences(
    pagesWithBlocks: Readonly<RoamPage>[],
    referencedPages: Set<Readonly<RoamPage>>,
  ) {
    const existingTitles = new Set(pagesWithBlocks.map(it => it.title))
    const orphans = [...referencedPages].filter(it => !existingTitles.has(it.title))
    return orphans.map(it => this.createOrphanPage(it.title))
  }

  private buildOrphanPages(orphanBlocks: Readonly<RoamBlock>[]) {
    const byPage = _.groupBy(orphanBlocks,
      (it: Readonly<RoamBlock>) => this.blockToPage.get(it?.uid))

    return _.keys(byPage).map(key => this.createOrphanPage(key, byPage[key]))
  }

  createOrphanPage = (name: string, blocks: Readonly<RoamBlock>[] = []): RoamPage =>
    ({
      title: name,
      uid: this.pageByName.get(name)?.uid || `orphan-${this.orphanId++}`,
      children: [{
        string: `## This is an "Orphan" page. Its core content has not been shared: what you see below is a ` +
          `loose collection of pages and page snippets that mention this page, as well as snippets of this ` +
          `page that were quoted elsewhere.`,
        uid: `orphan-${this.orphanId++}`,
      } as RoamBlock,
        ...blocks,
      ],
    })

  removePrivateBlocks = (pages: RoamPage[]) =>
    pages.map(page => removeChildMatching(page, this.filter.makeBlocksWithTheseTagsPrivate))

  findPublicPages = (pages: Array<Readonly<RoamPage>>) =>
    pages.filter(it => isPublic(it, this.filter.makePagesWithTheseTagsPublic))

  private buildBlockToPageMap() {
    this.allPages.forEach(it => visitChildren(it, block => {
      this.blockToPage.set(block["uid"], it.title)
    }))
  }

  /**
   * This is required to display content of the block in Backlinks/References section
   * Hence including the blocks that have references to any public pages
   * TODO: currently these are not rendered and only text is used, so can consider
   * not creating MDX nodes for these. Though would probably actually move to
   * using rendered version in the future
   */
  private buildBlocksReferencingPages(pages: Readonly<RoamPage>[]) {
    const blocksReferencingPages = new Set<Readonly<RoamBlock>>()
    const referencedPages = new Set<Readonly<RoamPage>>()

    pages.forEach(it => visitChildren(it, block => {
      if ("refs" in block) {
        const pagesInBlock = block.refs
          ?.map(ref => this.pageByUid.get(ref.uid))
          .filter(truthy)

        if (pagesInBlock?.length) blocksReferencingPages.add(block)
        pagesInBlock?.forEach(page => referencedPages.add(page))
      }
    }))
    return { blocksReferencingPages, referencedPages }
  }
}
