import WebSocket from "isomorphic-ws";
import { ClientConfig, createClient } from "./hub";
import { createRepl, ReplConfig } from "./repl";

type AppConfig = ReplConfig & ClientConfig;

// Add Websocket to our global namespace
Object.assign(global, { WebSocket });

/**
 * Clears require cache.
 */
const clearRequireCache = () => {
  Object.keys(require.cache).forEach(function (key) {
    delete require.cache[key];
  });
};

/**
 * Create the default threads repl.
 * @param opts Options for configuring the repl and underlying threads client.
 */
function createApp(opts: AppConfig = {}): void {
  const repl = createRepl(opts);
  createClient(opts).then(({ extendContext, extendCommands }) => {
    // Initialize our context and store function for reset
    const initializeContext = () => {
      clearRequireCache();
      extendContext(repl);
    };
    initializeContext();
    // Listen for the reset event
    repl.on("reset", initializeContext);
    // Remove all "custom" commands
    (repl as any).commands = Object.create(null);
    // Extend the repl context with read-only properties/function.
    extendCommands(repl);
  });
}

export { AppConfig, createApp };
