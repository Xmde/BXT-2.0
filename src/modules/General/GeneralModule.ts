// Simple module for general commands
import { Bot } from '../../client/Client';
import { BotModule } from '../../interfaces/Module';
import { Collection } from 'discord.js';

export default class GeneralModule extends BotModule {
	constructor(client: Bot) {
		super('general', __dirname);
		client.logger.info(`Initializing module ${this.displyName}`);
	}
}
