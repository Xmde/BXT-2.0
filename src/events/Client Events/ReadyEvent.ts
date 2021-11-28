// Event that runs when the bot is ready.
// Prints out a ready command to the console.

import { RunFunction } from '../../interfaces/Event';

export const name: string = 'ready';
export const once: boolean = true;

/**
 * Logs that the bot is ready to use.
 * @param client Bot client
 */
export const run: RunFunction = async (client) => {
	client.logger.info(`${client.user.tag} is now online`);
};
