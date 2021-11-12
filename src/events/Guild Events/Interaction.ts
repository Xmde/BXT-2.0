// Event that runs when the bot is ready.
// Prints out a ready command to the console.

import { ButtonInteraction, Interaction } from 'discord.js';
import { RunFunction } from '../../interfaces/Event';

export const name: string = 'interactionCreate';
export const once: boolean = false;

export const run: RunFunction = async (client, interaction: Interaction) => {
	//client.logger.debug(interaction);
};
