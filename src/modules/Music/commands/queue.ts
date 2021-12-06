// import { RunFunction } from '../../../interfaces/Command';
// import { BotModule } from '../../../interfaces/module';
// import Module from '../GeneralModule';

import { CommandInteraction, CacheType, Guild, GuildMember } from 'discord.js';
import { Bot } from '../../../client/Client';
import { Command } from '../../../interfaces/Command';
import { AudioPlayerStatus, AudioResource } from '@discordjs/voice';
import MusicModule, { Song } from '../MusicModule';
import { BotModule } from '../../../interfaces/Module';

export default class LeaveCommand extends Command {
	constructor(module: BotModule) {
		super({
			name: 'queue',
			help: 'Displays the current Queue for the Music Bot',
			info: 'Displays the Music Queue',
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
			const current =
				subscription.audioPlayer.state.status === AudioPlayerStatus.Idle
					? `Nothing is currently playing!`
					: `Playing **${
							(subscription.audioPlayer.state.resource as AudioResource<Song>)
								.metadata.title
					  }**`;

			const queue = subscription.queue
				.slice(0, 5)
				.map((track, index) => `${index + 1}) ${track.title}`)
				.join('\n');

			await interaction.reply(`${current}\n\n${queue}`);
		} else {
			return interaction.reply('I am not playing in this server');
		}
	}
}
