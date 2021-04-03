import { RoamJsonQuery } from "../filtering"
import { RoamPage } from "../types"

const testPage = {
  title: "test page no children or marker", uid: "p0",
}

const publicMarkerPage: RoamPage = {
  title: "public-marker",
  uid: "public-marker-uid",
}

const blockWithPublicMarker = {
  uid: "b1",
  string: "test block [[public-marker]]",
  refs: [{ uid: publicMarkerPage.uid }],
}
const pageWithPublicMarker: RoamPage = {
  title: "test page",
  uid: "p1",
  children: [blockWithPublicMarker],
}

const emptyFilter = {
  makePagesWithTheseTagsPublic: [], makeBlocksWithTheseTagsPrivate: [],
}

const filterWithPublicMarker = {
  ...emptyFilter,
  makePagesWithTheseTagsPublic: [publicMarkerPage.title],
}

const filterAskingForTestPage = {
  ...emptyFilter,
  pagesToMakePublic: [testPage.title],
}

const allPublicFilter = {
  ...emptyFilter,
  makeAllPagesPublic: true,
}

const parentOrphanUid = "parent-orphan-uid"
const childOrphanUid = "child-orphan-uid"
const pageToBeOrphaned: RoamPage = {
  title: "pageToBeOrphaned",
  uid: "pageToBeOrphaned-uid",
  children: [{
    uid: parentOrphanUid,
    string: "parent-orphan",
    children: [{
      uid: childOrphanUid,
      string: "child-orphan",
    }],
  }],
}

const pageReferencingOrphan: RoamPage = {
  title: "pageReferencingOrphan",
  uid: "pageReferencingOrphan-uid",
  children: [{
    uid: "referencer",
    string: `((${parentOrphanUid})), ((${childOrphanUid}))`,
    refs: [parentOrphanUid, childOrphanUid].map(it => ({
      uid: it,
    })),
  }],
}


const allPages = [publicMarkerPage, pageWithPublicMarker, testPage, pageToBeOrphaned, pageReferencingOrphan]

describe("RoamJsonQuery", () => {
  it("should return empty results when filter is empty", () => {
    const query = new RoamJsonQuery([testPage], emptyFilter)

    expect(query.getPagesToRender().pages).toBeEmpty()
  })

  it("should return only pages required to be public", () => {
    const toRender = new RoamJsonQuery(allPages, filterWithPublicMarker).getPagesToRender()

    expect(toRender.pages).toIncludeSameMembers([publicMarkerPage, pageWithPublicMarker])
    expect(toRender.blockUids).toEqual(new Set([blockWithPublicMarker.uid]))
  })

  it("should return all pages when filter says so", () => {
    const toRender = new RoamJsonQuery(allPages, allPublicFilter).getPagesToRender()

    expect(toRender.pages).toIncludeAllMembers(allPages)
  })

  it("should return test page when filter explicitly asks for it", () => {
    const toRender = new RoamJsonQuery(allPages, filterAskingForTestPage).getPagesToRender()

    expect(toRender.pages).toEqual([testPage])
  })

  it("should return all request public pages from combination of filters", () => {
    const toRender = new RoamJsonQuery(allPages,
      { ...filterAskingForTestPage, ...filterWithPublicMarker }).getPagesToRender()

    expect(toRender.pages).toIncludeAllMembers([publicMarkerPage, pageWithPublicMarker, testPage])
  })

  it("handle orphan reference hierarchy without creating duplicate blocks", () => {
    /**
     * Embeddings on a multiple levels create an obscure problem with blocks
     * duplicating. So when you have a reference to higher level block and then to it's child
     * they both become independently referenced. and will show up multiple times on the page
     *
     * This also had downstream effects of making filtering non-idempotent (starting to duplicate blocks)
     */

    const toRender = new RoamJsonQuery(allPages,
      {...emptyFilter, pagesToMakePublic: [pageReferencingOrphan.title]}).getPagesToRender()

    expect(toRender.pages).toContainEqual(pageReferencingOrphan)
    expect(toRender.pages).toBeArrayOfSize(2)

    const orphan = toRender.pages.find(it =>it.uid == pageToBeOrphaned.uid)
    // Orphan declaration + original top level block without duplication
    expect(orphan!.children).toBeArrayOfSize(2)
  })

})
