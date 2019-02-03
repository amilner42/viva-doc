// Module holds analysis errors

// Don't extend error:
// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
export class AnalysisError {

  // Stack trace
  public stack: any;

  constructor(...args: any[]) {
    Error.captureStackTrace(this, AnalysisError);
  }
}
