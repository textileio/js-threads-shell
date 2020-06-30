# ThreadDB Shell (_js-threads-shell_)

> A repl/shell for interacting with a (remote) threaddb

**Warning**

This is a work in progress, currently under active development and testing.
It is not (yet!) supported by the Textile team. Use and explore at your own risk!

## Development

*These are temporary development steps for early testing/evaluation.*

```
git clone git@github.com:textileio/js-threads-shell.git
cd js-threads-shell
npm i
npm link
```

Now edit your `empty.env` and save it somewhere useful, renaming it to `.env`.
You'll want to use credentials from your `hub` cli.
You can also specify these values at runtime via cli flags.

```
cd some/working/dir
threads --help

Usage: threads [options]

Options:
  -h, --host [host]         Remote Hub host (e.g., https://api.textile.io:3447)
  -k, --key [key]           User API key
  -d, --debug [debug]       Debug (default: "false")
  -s, --secret [secret]     User API secret
  -i --identity [identity]  User identity (private key)
  --help                    display help for command
```

If you want to hack on the repl, it is recommended you `watch` the files and
test the repl via `npm` scripts.
In one terminal run:

```
npm run watch
```

Then in a separate terminal:

```
npm run shell
```

You can pass cli flags to the shell via `npm` script with an additional `--`:

```
npm run shell -- --host=http://localhost:1234
```

You can also run `npm link` as described above, and the top-level `threads`
command will reflect any changes you have made due to the `watch` command.

Most customization happens in `./src/hub.ts` and/or `./src/db.ts`, where the
custom commands and various functions are specified. `hub.ts` is also where the
custom repl context is defined. You are unlikely to need to modify
`./bin/shell.ts`, `./src/repl.ts`, `./src/app.ts`.

If in doubt, create an issue!
