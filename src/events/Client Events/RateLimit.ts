// Event that runs when the bot is ready.
// Prints out a ready command to the console.

import { RateLimitData } from 'discord.js';
import { stringify } from 'querystring';
import { RunFunction } from '../../interfaces/Event';

export const name: string = 'rateLimit';
export const once: boolean = false;

/**
 * Logs that the bot is ready to use.
 * @param client Bot client
 */
export const run: RunFunction = async (
	client,
	rateLimitData: RateLimitData
) => {
	if (rateLimitData.global) {
		client.logger.warn(
			`Rate Limited ${rateLimitData.timeout}ms | LIMIT(${rateLimitData.limit}) | PATH(${rateLimitData.path}) | ROUTE(${rateLimitData.route})`
		);
		client.rateLimit(rateLimitData.timeout);
	} else {
		client.logger.info(
			`Rate Limited ${rateLimitData.timeout}ms | LIMIT(${rateLimitData.limit}) | PATH(${rateLimitData.path}) | ROUTE(${rateLimitData.route})`
		);
		client.rateLimit(rateLimitData.timeout, rateLimitData.route);
	}
};
