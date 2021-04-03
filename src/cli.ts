import { Command, flags } from "@oclif/command"
import { readFileSync, writeFileSync } from "fs"
import { RoamPage } from "./types"
import { Filter, RoamJsonQuery } from "./filtering"

class ExportCommand extends Command {
  static description = "describe the command here"

  static flags = {
    version: flags.version({ char: "v" }),
    help: flags.help({ char: "h" }),
    filter: flags.string({
      char: "f",
      description: "Filter json",
      parse: JSON.parse,
    }),
  }

  static args = [
    { name: "inputFile", required: true },
    { name: "outputFile" },
  ]

  async run() {
    const { args, flags } = this.parse(ExportCommand)

    const filter = flags.filter as any as Filter //lol

    const text = readFileSync(args.inputFile, { encoding: "utf8" })
    const roamPages = JSON.parse(text) as RoamPage[]
    const { pages } = new RoamJsonQuery(roamPages, filter).getPagesToRender()

    writeFileSync(args.outputFile, JSON.stringify(pages, null, 2))
  }
}

export = ExportCommand
