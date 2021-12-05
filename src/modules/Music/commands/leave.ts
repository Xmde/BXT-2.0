// import { RunFunction } from '../../../interfaces/Command';
// import { BotModule } from '../../../interfaces/module';
// import Module from '../GeneralModule';

import { CommandInteraction, CacheType, Guild, GuildMember } from 'discord.js';
import { Bot } from '../../../client/Client';
import { Command } from '../../../interfaces/Command';
import { SlashCommandBuilder } from '@discordjs/builders';
import {
	entersState,
	joinVoiceChannel,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import { Subscription } from '../Classes/Subscription';
import MusicModule from '../MusicModule';
import { BotModule } from '../../../interfaces/Module';
import { Song } from '../Classes/Song';

export default class LeaveCommand extends Command {
	constructor(module: BotModule) {
		super({
			name: 'leave',
			help: 'Leaves the discord channel',
			info: 'Leaves and stop the music bot',
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
			subscription.voiceConnection.destroy();
			this.module.subscriptions.delete(interaction.guild.id);
			return interaction.reply('Left the voice channel');
		} else {
			return interaction.reply('I am not playing in this server');
		}
	}
}
