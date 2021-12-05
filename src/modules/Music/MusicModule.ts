// Module for Music Module
import { Snowflake } from 'discord-api-types';
import { Bot } from '../../client/Client';
import { BotModule } from '../../interfaces/Module';
import { Subscription } from './Classes/Subscription';

export default class MusicModule extends BotModule {
	public subscriptions: Map<Snowflake, Subscription> = new Map<
		Snowflake,
		Subscription
	>();

	constructor(client: Bot) {
		super('music', __dirname);
		client.logger.info(`Initializing module ${this.displyName}`);
	}
}
