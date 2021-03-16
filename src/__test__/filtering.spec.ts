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
  ...filterWithPublicMarker,
  makePagesWithTheseTagsPublic: [publicMarkerPage.title],
  makeAllPagesPublic: true,
}


const allPages = [publicMarkerPage, pageWithPublicMarker, testPage]

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
})
