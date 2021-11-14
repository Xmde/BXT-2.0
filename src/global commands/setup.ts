// Global Command Setup.
// Sets up the database for the guild
// TODO: Add options so user can enable and disable modules and commands
import { GlobalRunFunction } from '../interfaces/Command';
import { setUpGuild } from '../events/Guild Events/GuildJoin';
import { SetupMenu } from '../interfaces/SetupMenu';

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
	new SetupMenu(client, message).run();
};
