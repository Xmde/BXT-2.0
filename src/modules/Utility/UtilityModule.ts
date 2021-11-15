// Simple module for Utility Commands
import { Bot } from '../../client/Client';
import { BotModule } from '../../interfaces/Module';

export default class UtilityModule extends BotModule {
	constructor(client: Bot) {
		super('utility', __dirname);
		client.logger.info(`Initializing module ${this.displyName}`);
	}
}
