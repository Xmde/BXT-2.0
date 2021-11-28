// Global Command Setup.
// Sets up the database for the guild
// TODO: Add options so user can enable and disable modules and commands
import { GlobalRunFunction } from '../interfaces/Command';
import { setUpGuild } from '../events/Guild Events/GuildJoin';
import { SetupMenu } from '../interfaces/SetupMenu';
import { Message } from 'discord.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const name: string = 'setup';

export const run: GlobalRunFunction = async (client, message, _) => {
	if (message.guild.ownerId !== message.author.id) {
		message.channel.send(
			client.messageEmbed(
				{ description: 'You must be the Guild Owner to run this Command!' },
				message
			)
		);
	}
	setUpGuild(client, message.guildId);
	const setupMenu = SetupMenu.getInstance(client, message);
	if (setupMenu) setupMenu.run();
	else {
		message.channel
			.send(
				client.messageEmbed(
					{
						description: 'A Setup Menu is already open for this Server!',
						color: '#ff0000',
					},
					message
				)
			)
			.then(async (msg: Message) => {
				await delay(5000);
				msg.delete();
			});
		message.delete();
	}
};
