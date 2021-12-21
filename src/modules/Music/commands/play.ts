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
import MusicModule, { Subscription, Song } from '../MusicModule';
import { BotModule } from '../../../interfaces/Module';

export default class PlayCommand extends Command {
	constructor(module: BotModule) {
		super({
			name: 'play',
			help: 'Play a song with a URL or Search Term',
			info: 'Plays a song',
			module,
		});
		(this.data as SlashCommandBuilder).addStringOption((input) => {
			return input
				.setName('input')
				.setRequired(true)
				.setDescription('The URL or Search Term of the song to play');
		});
	}

	public async run(client: Bot, interaction: CommandInteraction<CacheType>) {
		await interaction.deferReply();
		if (!(this.module instanceof MusicModule))
			return interaction.editReply('There was an error please try again later');
		if (!(interaction.member instanceof GuildMember))
			return interaction.editReply('There was an error please try again later');
		if (!interaction.member.voice.channel)
			return interaction.editReply(
				'You must be in a voice channel to play music!'
			);
		if (!interaction.member.permissions.has('CONNECT'))
			return interaction.editReply(
				'You do not have permission to connect to your voice channel!'
			);
		if (!interaction.member.permissions.has('SPEAK'))
			return interaction.editReply(
				'You do not have permission to speak in your voice channel!'
			);
		if (
			!interaction.member.voice.channel
				.permissionsFor(client.guilds.cache.get(interaction.guild.id).me)
				.has('CONNECT')
		)
			return interaction.editReply(
				'I do not have permission to connect to your voice channel!'
			);
		if (
			!interaction.member.voice.channel
				.permissionsFor(client.guilds.cache.get(interaction.guild.id).me)
				.has('SPEAK')
		)
			return interaction.editReply(
				'I do not have permission to speak in your voice channel!'
			);

		// Cheks to see if there is an active subscription
		let subscription = this.module.subscriptions.get(interaction.guild.id);

		if (!subscription) {
			const channel = interaction.member.voice.channel;
			subscription = new Subscription(
				joinVoiceChannel({
					channelId: channel.id,
					guildId: channel.guild.id,
					adapterCreator: channel.guild.voiceAdapterCreator,
				}),
				interaction.guild.id
			);
			subscription.voiceConnection.on('error', client.logger.warn);
			this.module.subscriptions.set(interaction.guild.id, subscription);
		}

		try {
			await entersState(
				subscription.voiceConnection,
				VoiceConnectionStatus.Ready,
				20e3
			);
		} catch (err) {
			client.logger.warn(`Failed to connect to voice channel | ${err}`);
			return interaction.editReply(
				'There was an error connecting to your voice channel try again later'
			);
		}

		try {
			const input = interaction.options.getString('input').split(' ');
			const song = await Song.from(input);
			if (song instanceof Song) {
				subscription.enqueue(song);
				interaction.editReply(
					`Added **${song.title}** to the queue!\n${song.url}`
				);
			} else {
				const data = song.shift();
				subscription.enqueue(song as Song[]);
				interaction.editReply(
					`Added **${data.title}** playlist to the queue!\n${data.url}`
				);
			}
		} catch (err) {
			client.logger.warn(`Failed to play song | ${err}`);
			return interaction.editReply(
				'There was an error finding that song or it is age restricted. Try again later'
			);
		}
	}
}
