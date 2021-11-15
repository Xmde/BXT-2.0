// import { RunFunction } from '../../../interfaces/Command';
// import { BotModule } from '../../../interfaces/module';
// import Module from '../GeneralModule';

import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, CacheType, Guild } from 'discord.js';
import { Bot } from '../../../client/Client';
import { Command } from '../../../interfaces/Command';
import { Collection } from 'discord.js';
import { BotModule } from '../../../interfaces/Module';

export default class PingCommand extends Command {
	constructor(module: BotModule) {
		super({
			name: 'ping',
			help: 'Just replies Pong dumdum',
			info: 'Ping Command',
			module,
		});
	}

	public run(client: Bot, interaction: CommandInteraction<CacheType>): void {
		client.logger.info('Ping Command Ran');
		interaction.reply('Pong!');
	}
}
