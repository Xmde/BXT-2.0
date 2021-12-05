import ytdl from 'ytdl-core';
import yts from 'yt-search';
import { Bot } from '../../../client/Client';
import {
	AudioResource,
	createAudioResource,
	demuxProbe,
} from '@discordjs/voice';

export class Song {
	public readonly title: string;
	public readonly url: string;

	public static async from(input: string[]): Promise<Song> {
		if (ytdl.validateURL(input[0])) {
			try {
				const video = await ytdl.getInfo(input[0]);
				return new Song({
					title: video.videoDetails.title,
					url: input[0],
				});
			} catch {
				Bot.getInstance().logger.warn(`Invalid URL: ${input[0]}`);
				throw new Error('Invalid URL');
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
