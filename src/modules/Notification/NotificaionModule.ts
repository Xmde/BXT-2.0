// Module for Notifications
import { Bot } from '../../client/Client';
import { BotModule } from '../../interfaces/Module';

export default class NotificationModule extends BotModule {
	constructor(client: Bot) {
		super('notification', __dirname);
		client.logger.info(`Initializing module ${this.displyName}`);
	}
}
