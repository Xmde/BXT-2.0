// Module for Music Module
import { Snowflake } from 'discord-api-types';
import { Guild } from 'discord.js';
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

	public async resetModule(client: Bot, guild: Guild): Promise<void> {
		client.logger.trace(`Resetting Notification Module for ${guild.name}`);
		if (this.subscriptions.has(guild.id)) {
			this.subscriptions.get(guild.id).voiceConnection?.destroy();
			this.subscriptions.get(guild.id).queue = [];
			this.subscriptions.delete(guild.id);
		}
	}
}
