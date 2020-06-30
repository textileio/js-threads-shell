#!/usr/bin/env node --experimental-repl-await

import prog from "commander";
import dotenv from "dotenv";
import { AppConfig, createApp } from "../src/app";
import { Color, colorize } from "../src/utils";

// Some useful stuff
const user = colorize(Color.magenta, process.env.USER || "");
const cwd = colorize(Color.yellow, process.cwd());

const config: AppConfig = {
  doc: [`Hello, ${user}!`, `Running Threads in ${cwd}`],
};

// Read the values of .env into the environment
dotenv.config();

prog.option(
  "-h, --host [host]",
  "Remote Hub host (e.g., https://api.textile.io:3447)"
);
prog.option("-k, --key [key]", "User API key");
prog.option("-d, --debug [debug]", "Debug", "false");
prog.option("-s, --secret [secret]", "User API secret");
prog.option("-i --identity [identity]", "User identity (private key)");
prog.parse(process.argv);

config.prompt = colorize(Color.green, "➜ ");
config.host = prog.host ?? process.env.HOST ?? "https://api.textile.io:3447";
config.keyInfo = {
  key: prog.key ?? process.env.USER_API_KEY,
  secret: prog.secret ?? process.env.USER_API_SECRET,
  type: 1,
};
config.debug = prog.debug === "true";
config.identity = prog.identity ?? process.env.USER_IDENTITY;

createApp(config);
