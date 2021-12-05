// Event for new messages
// Used for global Commands
// Global commands do NOT use the slash command handler with interactions

import { Message } from 'discord.js';
import { Bot } from '../../client/Client';
import { GlobalCommand } from '../../interfaces/Command';
import { RunFunction } from '../../interfaces/Event';

export const name: string = 'messageCreate';
export const once: boolean = false;

/**
 * Makes sure that the message is from a user in a guild.
 * Then runs the appropiae command which was set up in the startup in the Bot class
 * Used for global commands
 * @param client Bot client
 * @param message The Message Object
 * @returns None
 */
export const run: RunFunction = async (client, message: Message) => {
	if (message.partial) {
		return client.logger.warn(`Partial message received: ${message.id}`);
	}
	if (message.author.bot || !message.content.toLowerCase().startsWith('bxt!'))
		return;
	const args: string[] = message.content
		.slice('bxt!'.length)
		.trim()
		.split(/ +/g);
	const cmd: string = args.shift();
	const command: GlobalCommand = client.globalCommands.get(cmd);
	if (!command) return;
	client.logger.debug(
		`Recived a Global Command | ${cmd} | ${args.length === 0 ? 'None' : args}`
	);
	command.run(client, message, args).catch((reason: any) => {
		message.channel.send({
			embeds: [Bot.embed({ description: `An Error Occured!` }, message)],
		});
		client.logger.error(`Error Occured durring Command! | ${reason}`);
	});
};
