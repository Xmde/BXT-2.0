import { Config } from './interfaces/config';
import * as File from '../config.json';
import { Bot } from './client/Client';

// Start the bot with the config.
Bot.getInstance().start(File as Config);
