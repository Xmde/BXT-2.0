import {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	entersState,
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import { Snowflake, TeamMemberMembershipState } from 'discord-api-types';
import { threadId } from 'worker_threads';
import { Bot } from '../../../client/Client';
import MusicModule from '../MusicModule';
import { Song } from './Song';

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
