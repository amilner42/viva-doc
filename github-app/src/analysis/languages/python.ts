// Module for python-specific parsing functionality

import { VdTag, AnalyzeFileParams } from "../tag-parser"

// Parses all VD tags from a python file.
export const parseVdTags = (params: AnalyzeFileParams): VdTag[] => {

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
