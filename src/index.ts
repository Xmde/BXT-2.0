import { Config } from './interfaces/config';
import * as File from '../config.json';
import { Bot } from './client/Client';
import consolaGlobalInstance from 'consola';

// Error handling
process.on('uncaughtException', (error) => {
	consolaGlobalInstance.error(error);
});
process.on('unhandledRejection', (error) => {
	throw error;
});

// Start the bot with the config.
new Bot().start(File as Config);
