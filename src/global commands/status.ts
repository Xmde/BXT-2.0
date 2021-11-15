import { ActivityTypes } from 'discord.js/typings/enums';
import { GlobalRunFunction } from '../interfaces/Command';

export const name: string = 'status';

export const run: GlobalRunFunction = async (client, message, args) => {
	if ('125270885782388736' !== message.author.id) return;
	let type;
	switch (args.shift().toLowerCase()) {
		case 'playing':
			type = 'PLAYING';
			break;
		case 'listening':
			type = 'LISTENING';
			break;
		case 'streaming':
			type = 'STREAMING';
			break;
		case 'competing':
			type = 'COMPETING';
			break;
		case 'watching':
		default:
			type = 'WATCHING';
			break;
	}
	if (args[0])
		client.user.setPresence({
			activities: [
				{
					type,
					name: args.join(' '),
				},
			],
			status: 'online',
			afk: false,
		});
};
