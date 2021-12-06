// Module for Music Module
import { Snowflake } from 'discord-api-types';
import { Guild } from 'discord.js';
import { Bot } from '../../client/Client';
import { BotModule } from '../../interfaces/Module';
import ytdl from 'ytdl-core';
import yts from 'yt-search';
import ytpl from 'ytpl';
import {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	entersState,
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
	createAudioResource,
	demuxProbe,
} from '@discordjs/voice';

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

/**
 * @class Subscription
 * @description Represents a music subscription to a guild.
 * @property {Snowflake} guildId The guild id
 * @property {VoiceConnection} voiceConnection The voice connection
 * @property {AudioPlayer} audioPlayer The audio player
 * @property {Song[]} queue The queue of songs
 * Handles all the logic for the queue and audio player
 */
export class Subscription {
	public readonly voiceConnection: VoiceConnection;
	public readonly audioPlayer: AudioPlayer;
	public queue: Song[];

	private readyLock: boolean = false;
	private queueLock: boolean = false;
	private guildId: Snowflake;

	constructor(voiceConnection: VoiceConnection, guildId: Snowflake) {
		this.guildId = guildId;
		this.voiceConnection = voiceConnection;
		this.audioPlayer = createAudioPlayer();
		this.queue = [];

		this.voiceConnection.on(
			'stateChange',
			async (
				_: any,
				newState: { status: any; reason: any; closeCode: number }
			) => {
				if (newState.status === VoiceConnectionStatus.Disconnected) {
					if (
						newState.reason ===
							VoiceConnectionDisconnectReason.WebSocketClose &&
						newState.closeCode === 4014
					) {
						/**
						 * If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
						 * but there is a chance the connection will recover itself if the reason of the disconnect was due to
						 * switching voice channels. This is also the same code for the bot being kicked from the voice channel,
						 * so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
						 * the voice connection.
						 */
						try {
							await entersState(
								this.voiceConnection,
								VoiceConnectionStatus.Connecting,
								5_000
							);
							// Probably moved voice channel
						} catch {
							this.voiceConnection.destroy();
							// Probably removed from voice channel
						}
					} else if (this.voiceConnection.rejoinAttempts < 5) {
						/**
						 * The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
						 */
						await Bot.delay((this.voiceConnection.rejoinAttempts + 1) * 5_000);
						this.voiceConnection.rejoin();
					} else {
						/**
						 * The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
						 */
						this.voiceConnection.destroy();
					}
				} else if (newState.status === VoiceConnectionStatus.Destroyed) {
					/**
					 * Once destroyed, stop the subscription.
					 */
					this.stop();
				} else if (
					!this.readyLock &&
					(newState.status === VoiceConnectionStatus.Connecting ||
						newState.status === VoiceConnectionStatus.Signalling)
				) {
					/**
					 * In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
					 * before destroying the voice connection. This stops the voice connection permanently existing in one of these
					 * states.
					 */
					this.readyLock = true;
					try {
						await entersState(
							this.voiceConnection,
							VoiceConnectionStatus.Ready,
							20_000
						);
					} catch {
						if (
							this.voiceConnection.state.status !==
							VoiceConnectionStatus.Destroyed
						)
							this.voiceConnection.destroy();
					} finally {
						this.readyLock = false;
					}
				}
			}
		);

		// Configure audio player
		this.audioPlayer.on(
			'stateChange',
			(
				oldState: { status: any; resource: any },
				newState: { status: any; resource: any }
			) => {
				if (
					newState.status === AudioPlayerStatus.Idle &&
					oldState.status !== AudioPlayerStatus.Idle
				) {
					// If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
					// The queue is then processed to start playing the next track, if one is available.
					void this.processQueue();
				} else if (newState.status === AudioPlayerStatus.Playing) {
					// If the Playing state has been entered, then a new track has started playback.
				}
			}
		);

		this.audioPlayer.on('error', (error: { resource: any }) =>
			Bot.getInstance().logger.error(error.resource)
		);

		voiceConnection.subscribe(this.audioPlayer);
	}

	public enqueue(song: Song | Song[]) {
		if (Array.isArray(song)) {
			song.forEach((s) => this.enqueue(s));
		} else {
			this.queue.push(song);
			this.processQueue();
		}
	}

	public stop() {
		this.queueLock = true;
		this.queue = [];
		this.audioPlayer.stop();
	}

	private async processQueue() {
		if (this.queue.length === 0) {
			this.voiceConnection.destroy();
			return (
				Bot.getInstance().modules.get('music') as MusicModule
			).subscriptions.delete(this.guildId);
		}
		if (
			this.queueLock ||
			this.audioPlayer.state.status !== AudioPlayerStatus.Idle
		)
			return;
		this.queueLock = true;

		const track = this.queue.shift();

		try {
			const stream = await track.createAudioResource();
			this.audioPlayer.play(stream);
			this.queueLock = false;
		} catch (e) {
			this.queueLock = false;
			Bot.getInstance().logger.error(e);
			return this.processQueue();
		}
	}
}

/**
 * @class Song
 * @description Class which represents a song in the queue.
 * @property {string} url - The URL of the Song
 * @property {string} title - The title of the Song
 * @method {Promise<AudioResource>} createAudioResource - Creates an AudioResource from the Song
 * @static method {Promise<Song | Song[]>} fromUrl - Creates a Song from a URL or Search Query
 */
export class Song {
	public readonly title: string;
	public readonly url: string;

	public static async from(input: string[]): Promise<Song | any[]> {
		if (ytdl.validateURL(input[0])) {
			try {
				const video = await ytdl.getInfo(input[0]);
				return new Song({
					title: video.videoDetails.title,
					url: video.videoDetails.video_url,
				});
			} catch {
				Bot.getInstance().logger.warn(`Invalid URL: ${input[0]}`);
				throw new Error('Invalid URL');
			}
		} else if (ytpl.validateID(input[0])) {
			try {
				const playlist = await ytpl(input[0]);
				const songs: any[] = [{ title: playlist.title, url: playlist.url }];
				playlist.items.forEach((item) => {
					songs.push(
						new Song({
							title: item.title,
							url: item.shortUrl,
						})
					);
				});
				return songs;
			} catch {
				Bot.getInstance().logger.warn(`Invalid Playlist Url: ${input[0]}`);
				throw new Error('Invalid Playlist URL');
			}
		} else {
			try {
				const videos = await yts(input.join(' '));
				const video = videos.videos[0];
				return new Song({
					title: video.title,
					url: video.url,
				});
			} catch (e) {
				Bot.getInstance().logger.warn(
					`Invalid search: ${input.join(' ')} | ${e}`
				);
				throw new Error('Invalid search');
			}
		}
	}

	public createAudioResource(): Promise<AudioResource> {
		return new Promise((resolve, reject) => {
			const video = ytdl(this.url, { filter: 'audioonly' });
			demuxProbe(video)
				.then((probe: { stream: any; type: any }) =>
					resolve(
						createAudioResource(probe.stream, {
							metadata: this,
							inputType: probe.type,
						})
					)
				)
				.catch(reject);
		});
	}

	private constructor({ title, url }: { title: string; url: string }) {
		this.title = title;
		this.url = url;
	}
}
