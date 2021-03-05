import { RoamJson } from "../filtering"

describe("RoamJson", ()=> {
  it("should run", () => {
    const filter = new RoamJson([{
      title: "t1", uid: "t1"
    }], {
      makePagesWithTheseTagsPublic:[], makeBlocksWithTheseTagsPrivate: []
    })

    expect(filter.getPagesToRender().pages).toBeEmpty()
  })
})
