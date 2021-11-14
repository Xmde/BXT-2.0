// import { RunFunction } from '../../../interfaces/Command';
// import { BotModule } from '../../../interfaces/module';
// import Module from '../GeneralModule';

import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, CacheType, Guild } from 'discord.js';
import { Bot } from '../../../client/Client';
import { Command } from '../../../interfaces/Command';
import { Collection } from 'discord.js';
import { BotModule } from '../../../interfaces/module';

export default class PingCommand extends Command {
	public defaultSettings = new Collection<string, any>();

	constructor(module: BotModule) {
		super({
			name: 'ping',
			help: 'Simple Ping Command',
			info: 'Ping Command',
			module,
		});
	}

	public async enable(bot: Bot, guild: Guild): Promise<void> {
		await this.setStatus(bot, guild.id, true);
		this.registerCommand(bot, guild);
	}
	public async disable(bot: Bot, guild: Guild): Promise<void> {
		await this.setStatus(bot, guild.id, false);
		this.unregisterCommand(bot, guild);
	}

	public run(
		client: Bot,
		interaction: CommandInteraction<CacheType>
	): Promise<void> {
		client.logger.info('Ping Command Ran');
		interaction.reply('Pong!');
		return Promise.resolve();
	}
}
