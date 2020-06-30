import Repl, { REPLEval, ReplOptions, REPLServer } from "repl";
import { Context } from "vm";

/**
 * A set of options for configuring the shell.
 */
interface ReplConfig {
  /**
   * Custom prompt string.
   */
  prompt?: string;
  /**
   * Set of preliminary docs to print to console.
   */
  doc?: string[];
}

/**
 * Create a custom REPL/shell with predefined commands and context.
 * @param opts The set of custom options
 */
function createRepl(opts: ReplConfig = {}): REPLServer {
  const options: ReplOptions = {
    prompt: opts.prompt || "> ",
    input: process.stdin,
    output: process.stdout,
    useColors: true,
    // We'll use our own custom Context
    useGlobal: false,
    // Don't print undefined to the console
    ignoreUndefined: true,
    // @todo: We might want our own `completer` implementation
    // We keep this sloppy for make assignment ops easier
    replMode: Repl.REPL_MODE_SLOPPY,
  };

  const doc = opts.doc ?? [];
  doc.push("To exit press ^C twice, or ^D once.");
  doc.forEach(function (line) {
    options.output?.write(line + "\n");
  });

  // Start the REPL server
  const repl = Repl.start(options);

  // Listen for the exit event
  repl.on("exit", () => {
    repl.write("\n");
    process.exit(0);
  });

  // https://github.com/nodejs/node/issues/13209#issuecomment-619526317
  const defaultEval: REPLEval = repl.eval;
  (repl as any).eval = function (
    this: REPLServer,
    evalCmd: string,
    context: Context,
    file: string,
    cb: (err: Error | null, result: any) => void
  ): void {
    defaultEval.bind(this)(
      evalCmd,
      context,
      file,
      async (err: Error | null, result?: any): Promise<void> => {
        if (err) {
          // propagate errors from the eval
          cb(err, undefined);
        } else {
          // awaits the promise and either return result or error
          try {
            cb(null, await Promise.resolve(result));
          } catch (err) {
            cb(err, undefined);
          }
        }
        return;
      }
    );
  };

  return repl;
}

export { createRepl, ReplConfig };
