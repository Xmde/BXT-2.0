// import { RunFunction } from '../../../interfaces/Command';
// import { BotModule } from '../../../interfaces/module';
// import Module from '../GeneralModule';

import { CommandInteraction, CacheType, Guild, GuildMember } from 'discord.js';
import { Bot } from '../../../client/Client';
import { Command } from '../../../interfaces/Command';
import MusicModule from '../MusicModule';
import { BotModule } from '../../../interfaces/Module';

export default class LeaveCommand extends Command {
	constructor(module: BotModule) {
		super({
			name: 'resume',
			help: 'Resume the Music Bot',
			info: 'Resume the Music Bot',
			module,
		});
	}

	public async run(client: Bot, interaction: CommandInteraction<CacheType>) {
		if (!interaction.guild) {
			return interaction.reply('This command can only be used in a server');
		}
		if (!(this.module instanceof MusicModule))
			return interaction.reply('There seems to be an Error');
		const subscription = this.module.subscriptions.get(interaction.guild.id);

		if (subscription) {
			subscription.audioPlayer.unpause();
			return interaction.reply('Resumed the Music');
		} else {
			return interaction.reply('I am not playing in this server');
		}
	}
}
