// Module for cplusplus-specific parsing functionality

import { VdTag, DiffWithFiles } from "../tag-parser"

// Parses all VD tags from a cplusplus file.
export const parseVdTags = (diffWithFiles: DiffWithFiles): VdTag[] => {

  // Parse file according to diff type
  switch (diffWithFiles.diffType) {

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
