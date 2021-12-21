import { Bot } from '../client/Client';
import { GlobalRunFunction } from '../interfaces/Command';
import { removeGuild } from '../events/Guild Events/GuildLeave';
import { deflateSync } from 'zlib';

export const name: string = 'admin';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const run: GlobalRunFunction = async (client, message, args) => {
	if (message.channel.type !== 'DM') return;
	if (!client.application?.owner) await client.application?.fetch();
	if (client.application.owner.id !== message.author.id) return;

	const action = args.shift();
	if (!action) {
		const embed = Bot.embed(
			{
				title: 'Admin Commands',
			},
			message
		);
		embed.addField('`reload *TODO*`', 'Reloads the bot.');
		embed.addField('`reset`', 'resets the DB and Commands for a guild');
		embed.addField('`resetall`', 'resets the DB and Commands for all guilds');

		return message.channel.send({
			embeds: [embed],
		});
	}

	switch (action) {
		// Reloads the bot **TODO**
		case 'update':
			message.channel.send('Updating Bot... Restarting in 10 Minutes');
			client.user.setActivity({
				type: 'PLAYING',
				name: 'Updating in 10 Minutes',
			});
			await delay(1000 * 60 * 5);
			client.user.setActivity({
				type: 'PLAYING',
				name: 'Updating in 5 Minutes',
			});
			await delay(1000 * 60);
			client.user.setActivity({
				type: 'PLAYING',
				name: 'Updating in 4 Minutes',
			});
			await delay(1000 * 60);
			client.user.setActivity({
				type: 'PLAYING',
				name: 'Updating in 3 Minutes',
			});
			await delay(1000 * 60);
			client.user.setActivity({
				type: 'PLAYING',
				name: 'Updating in 2 Minutes',
			});
			await delay(1000 * 60);
			client.user.setActivity({
				type: 'PLAYING',
				name: 'Updating in 1 Minute',
			});
			await delay(1000 * 60);
			client.user.setActivity({ type: 'PLAYING', name: 'Updating...' });
			await delay(1000 * 10);
			process.exit(0);

		// Resets on guild. Removes all commands and data for a guild.
		case 'reset':
			const guild = client.guilds.cache.get(args[0]);
			if (!guild) return message.channel.send('No guild found');
			removeGuild(client, guild, false);
			return message.channel.send(`Resetting guild ${guild.name}(${guild.id})`);

		// Resets on all guilds. Removes all commands and data for all guilds.
		case 'resetall':
			(await client.application.commands.fetch()).forEach((command) => {
				command.delete();
			});
			client.guilds.cache.forEach((guild) => {
				removeGuild(client, guild, false);
			});
			return message.channel.send('Resetting all guilds');
	}
};
