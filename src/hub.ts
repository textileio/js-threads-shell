import { Context } from "@textile/context";
import { Client, KeyInfo } from "@textile/hub";
import { Query, Where } from "@textile/threads-client";
import {
  Identity,
  Libp2pCryptoIdentity,
  ThreadID,
} from "@textile/threads-core";
import { REPLCommand, REPLServer } from "repl";
import util from "util";
import { Pool } from "./db";

/**
 * Options for configuring the remote hub client.
 */
interface ClientConfig {
  /**
   * The addr for the remote host.
   */
  host?: string;
  /**
   * The port for the remote host.
   */
  port?: number;
  /**
   * User key info.
   */
  keyInfo?: KeyInfo;
  /**
   * User identity as base32 encoded private key.
   * @see Libp2pCryptoIdentity
   */
  identity?: string;
  /**
   * Should we run in debug mode?
   */
  debug?: boolean;
}

interface HubSetup {
  extendContext: (repl: REPLServer) => void;
  extendCommands: (repl: REPLServer) => void;
}

const playground = {
  model: "Person",
  schema: {
    $id: "https://example.com/person.schema.json",
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Person",
    type: "object",
    properties: {
      firstName: {
        type: "string",
        description: "The person's first name.",
      },
      lastName: {
        type: "string",
        description: "The person's last name.",
      },
      age: {
        description:
          "Age in years which must be equal to or greater than zero.",
        type: "integer",
        minimum: 0,
      },
    },
  },
  adam: {
    firstName: "Adam",
    lastName: "Doe",
    age: 21,
  },
  eve: {
    firstName: "Eve",
    lastName: "Doe",
    age: 21,
  },
  query: new Where("firstName").eq("Adam"),
};

async function createClient(opts: ClientConfig = {}): Promise<HubSetup> {
  const { keyInfo, identity } = opts;
  const client: Client = new Client(new Context(opts.host, opts.debug));
  if (keyInfo !== undefined) {
    if (keyInfo.key !== undefined && keyInfo.secret !== undefined) {
      const date = new Date(Date.now() + 100 * 60000);
      await client.context.withKeyInfo(keyInfo, date);
    }
  }
  if (identity) {
    await client.getToken(await Libp2pCryptoIdentity.fromString(identity));
  }

  // Create a database pool, and pull from remote
  const pool = new Pool(client);

  /**
   * A set of custom hub functions to be added to the repl context.
   * @todo Find a nicer way to handle help messages for context
   */
  const context: Record<string, { help: string; value: any }> = {
    client: {
      help: "Remote ThreadDB client instance.",
      value: client,
    },
    authenticate: {
      help:
        "A function to authenticate with a remote hub.\n" +
        "@param `keyInfo` A key info object, as derived from the hub cli.\n" +
        "@param `duration` amount of time (minutes) for which the authentication should be valid.\n" +
        "Defaults to 10.",
      value: async (keyInfo?: KeyInfo, duration = 10): Promise<void> => {
        const info = keyInfo ?? opts.keyInfo;
        if (info === undefined) {
          throw new Error("Authentication error: missing key info.");
        }
        // If a duration is supplied, create a date `duration` milliseconds into the future
        const date = new Date(Date.now() + duration * 60000);
        // Use key info and date to specify authentication headers on our client
        await client.context.withKeyInfo(info, date);
        return undefined;
      },
    },
    randomIdentity: {
      help: "Create a random libp2p-crypto compatible identity.",
      value: (): Promise<Identity> => Client.randomIdentity(),
    },
    getToken: {
      help:
        "Authenticate and retrieve token from remote client for identity management.\n" +
        "@param `identity` The private key identity to use for authentication.\n" +
        "Will attempt to use an environment variable (USER_IDENTITY) or a .env file.",
      value: async (identity?: Identity): Promise<string> => {
        const ident =
          identity ??
          (opts.identity
            ? await Libp2pCryptoIdentity.fromString(opts.identity)
            : undefined);
        if (ident === undefined) {
          throw new Error(
            "Authentication error: missing identity info.\n" +
              "Consider using `await randomIdentity()` to generate a new random identity."
          );
        }
        return client.getToken(ident);
      },
    },
    playground: {
      help: "Set of default schemas and instances to play with.",
      value: playground,
    },
    ThreadID: {
      help: "ThreadID class for working with thread ids.",
      value: ThreadID,
    },
    Query: {
      help: "Object for building store queries.",
      value: Query,
    },
    Where: {
      help:
        "Object for building queries of the form: `Where('property').eq('some value')` etc.",
      value: Where,
    },
  };

  /**
   * Extend the context, keeping all new properties read-only.
   */
  const extendContext = (repl: REPLServer) => {
    Object.entries(context).forEach(([k, v]) => {
      Object.defineProperty(repl.context, k, {
        configurable: false, // Read-only
        enumerable: true,
        value: v.value,
      });
    });
    // Special getter for db
    Object.defineProperty(repl.context, "db", {
      configurable: false,
      enumerable: true,
      get: () => pool.active(),
    });
  };

  /**
   * A set of custom hub commands to be added to the repl.
   */
  const commands: Record<string, REPLCommand> = {
    use: {
      help:
        "Use a database by name and assign it to the `db` instance in the shell.\n" +
        "The database will be created if it doesn't already exist.",
      action(name: string) {
        this.clearBufferedCommand();
        pool.use(name).then((db) => {
          console.log(`Switched to "${name}" database.`);
          this.displayPrompt();
        });
      },
    },
    list: {
      help: "List all known databases by name.",
      action() {
        this.clearBufferedCommand();
        pool.getDbs().then((dbs) => {
          console.log(util.inspect(dbs, false, 2, true));
          this.displayPrompt();
        });
      },
    },
    help: {
      help: "List all custom repl commands and functions/objects/classes.",
      action() {
        this.clearBufferedCommand();
        console.log("Commands:");
        for (const [name, action] of Object.entries(commands)) {
          console.log(
            `\n.${name}:\t\t${action.help?.split("\n").join("\n\t\t")}`
          );
        }
        console.log("\nFunctions/Objects:");
        for (const [name, action] of Object.entries(context)) {
          console.log(
            `\n${(name + ":").padEnd(15)} ${action.help
              .split("\n")
              .join("\n\t\t")}`
          );
        }
        this.displayPrompt();
      },
    },
  };

  /**
   * Define a set of commands on a REPL.
   */
  const extendCommands = (repl: REPLServer) => {
    Object.entries(commands).forEach(([k, v]) => {
      repl.defineCommand(k, v);
    });
  };

  return { extendContext, extendCommands };
}

export { ClientConfig, createClient };
