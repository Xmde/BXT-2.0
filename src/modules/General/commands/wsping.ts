// import { RunFunction } from '../../../interfaces/Command';
// import { BotModule } from '../../../interfaces/module';
// import Module from '../GeneralModule';
import { CommandInteraction, CacheType, Guild } from 'discord.js';
import { Bot } from '../../../client/Client';
import { Command } from '../../../interfaces/Command';
import { BotModule } from '../../../interfaces/Module';

export default class PingCommand extends Command {
	constructor(module: BotModule) {
		super({
			name: 'wsping',
			help: 'Displays info about ',
			info: 'Advanced Ping Command',
			module,
		});
		this.displayName = 'WSPing';
	}

	public async run(
		client: Bot,
		interaction: CommandInteraction<CacheType>
	): Promise<void> {
		const time = Date.now();
		let msg = await interaction.channel.send('Pinging...');
		const timeCreate = Date.now();
		await msg.delete();
		const timeRTT = Date.now();
		msg = await interaction.channel.send('Pinging...');
		msg = await msg.edit(`Pinging..`);
		const timedis1 = msg.createdTimestamp;
		const timedis2 = msg.editedTimestamp;
		msg.delete();
		interaction.reply({
			embeds: [
				Bot.embed(
					{
						description: `WebSocket: ${client.ws.ping}ms\nMessage Create: ${
							timeCreate - time
						}ms\nMessage Delete: ${timeRTT - timeCreate}\nMessage RTT: ${
							timeRTT - time
						}ms\nMessage Edit: ${timedis2 - timedis1}ms`,
					},
					interaction
				),
			],
			ephemeral: true,
		});
	}
}
