import { FileAST } from "./index"
import { VdTag } from "../tag-parser"

import { DefaultErrorStrategy } from 'antlr4ts/DefaultErrorStrategy';


/** To keep track of the existance of some error during parsing. */
export class ErrorHappenedStrategy extends DefaultErrorStrategy {

  public hasError: boolean;

  constructor() {
    super();
    this.hasError = false;
  }

  // Called during parsing error
  reportError() {
    this.hasError = true;
  }
}

/** Most languages will get the tags from the AST the same way.

  Noteable exceptions are languages like python which can have comments under the function declarations instead of
  before.
 */
export const standardTagsFromFileAst = (fileAst: FileAST): VdTag[] => {
  throw new Error("NOT IMPLEMENTED")
}
