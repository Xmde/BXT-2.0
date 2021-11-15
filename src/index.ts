import { Config } from './interfaces/config';
import * as File from '../config.json';
import { Bot } from './client/Client';

// Start the bot with the config.
new Bot().start(File as Config);
