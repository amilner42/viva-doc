// Module for javascript-specific parsing functionality

import { VdTag, AnalyzeFileParams } from "../tag-parser"

// Parses all VD tags from a javascript file.
export const parseVdTags = (params: AnalyzeFileParams): VdTag[] => {

  console.log(`Params: ${JSON.stringify(params)}`)

  // Parse file according to diff type
  switch (params.type) {

    case "new":
      throw new Error("NOT IMPLEMENETED")

    case "deleted":
      throw new Error("NOT IMPLEMENETED")

    case "modified":
      throw new Error("NOT IMPLEMENETED")

    case "renamed":
      throw new Error("NOT IMPLEMENETED")

  }

}
