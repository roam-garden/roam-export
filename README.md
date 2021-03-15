# roam-export

Export filtering and processing library for https://roam.garden/

### Usage

A basic usage is as follows:

```typescript
import { RoamBlock, RoamJsonQuery, RoamPage } from "roam-export"
import { readFileSync } from "fs"

const data = readFileSync("path to json export", "utf8")
const allPages = JSON.parse(data) as Array<RoamPage>
  
const { pages, blockUids } = new RoamJsonQuery(allPages, 
  {makePagesWithTheseTagsPublic: ["make-public"], makeBlocksWithTheseTagsPrivate: []}).getPagesToRender()
  
// do something with pages
```

There are more tools for operating on Roam JSON available internally
