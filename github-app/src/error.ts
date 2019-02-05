// Module for representing the root error type.

/** The root error type.

The proto framework wants errors to have a `stack` and `message` field for pretty printing.

  WARNING:
    Don't extend `Error`:
    https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work

*/
export class ProtoAppError {

  public stack: any
  public message: string

  constructor(msg: string) {
    const err = new Error()
    this.message = msg;
    this.stack = err.stack
  }
}
