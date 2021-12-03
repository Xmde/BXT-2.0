import { ContextMenuCommandBuilder } from '@discordjs/builders';
import { ApplicationCommandType } from 'discord-api-types/v9';
import {
	CommandInteraction,
	CacheType,
	VoiceChannel,
	StageChannel,
	Collection,
	Guild,
	ContextMenuInteraction,
} from 'discord.js';
import { Bot } from '../../../client/Client';
import { Command } from '../../../interfaces/Command';
import { BotModule } from '../../../interfaces/Module';

export default class PingCommand extends Command {
	constructor(module: BotModule) {
		super({
			name: 'Rollercoaster',
			help: 'Makes the user have a FUN time',
			info: 'Rollercoaster Command',
			module,
			contextMenu: true,
		});
		this.data = new ContextMenuCommandBuilder()
			.setName('Rollercoaster')
			.setType(ApplicationCommandType.User);
	}

	public async run(
		client: Bot,
		interaction: ContextMenuInteraction<CacheType>
	): Promise<void> {
		if (client.isRateLimited(`/guilds/${interaction.guildId}/members/:id`)) {
			interaction.reply({
				content: 'You must wait before using that command!',
				ephemeral: true,
			});
			return;
		}
		const guild = client.guilds.cache.get(interaction.guildId);
		const user = guild!.members.cache.get(interaction.targetId);

		//Gets a bunch of usefull info from discord.
		const originalChannel = user!.voice.channel;
		const voiceChannels = (await guild!.channels.fetch()).filter(
			(channel) => channel.type === 'GUILD_VOICE'
		);

		//Checks to see if the user is in a channel.
		if (!originalChannel) {
			interaction.reply({
				content: 'That user is not in a channel!',
				ephemeral: true,
			});
			return;
		}

		//Checks to makre sure that there are more than 2 channels in the discord server.
		if (voiceChannels.size < 3) {
			interaction.reply({
				content: 'You need more voice channels in this server.',
				ephemeral: true,
			});
			return;
		}

		interaction.reply('Have Fun!');
		let randomChannel = originalChannel;

		//Loop which gets a random voice channel and move the user to it.
		for (let i = 0; i < 9; i++) {
			randomChannel = voiceChannels
				.filter((c) => c.id !== randomChannel.id)
				.random() as VoiceChannel | StageChannel;
			await user!.voice.setChannel(randomChannel);
			//await delay(50);
		}

		//Sets the user back to the original channel.
		await user!.voice.setChannel(originalChannel);
		client.rateLimit(7500, `/guilds/${interaction.guildId}/members/:id`);
		//await delay(3000);
		try {
			interaction.deleteReply();
		} catch {}
	}
}
