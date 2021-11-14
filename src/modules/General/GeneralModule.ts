// Simple module for general commands
import { Guild } from 'discord.js';
import { Bot } from '../../client/Client';
import { BotModule } from '../../interfaces/module';
import { Collection } from 'discord.js';

export default class GeneralModule extends BotModule {
	public defaultSettings = new Collection<string, any>();

	constructor(client: Bot) {
		super('general', __dirname);
		client.logger.info(`Initializing module ${this.displyName}`);
	}
	public async enable(client: Bot, guild: Guild): Promise<void> {
		await this.setStatus(client, guild.id, true);
		client.logger.info(
			`Enabled module ${this.displyName} for guild ${guild.name}`
		);
	}
	public async disable(client: Bot, guild: Guild): Promise<void> {
		await this.disableCommands(client, guild);
		await this.setStatus(client, guild.id, false);
		client.logger.info(
			`Disabled module ${this.displyName} for guild ${guild.name}`
		);
	}
}
