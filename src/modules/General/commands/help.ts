import { Embed } from '@discordjs/builders';
import { CommandInteraction, CacheType, Guild } from 'discord.js';
import { Bot } from '../../../client/Client';
import { Command } from '../../../interfaces/Command';
import { BotModule } from '../../../interfaces/Module';

export default class PingCommand extends Command {
	constructor(module: BotModule) {
		super({
			name: 'help',
			help: 'Displays this screen',
			info: 'Help Command',
			module,
		});
	}

	public async run(
		client: Bot,
		interaction: CommandInteraction<CacheType>
	): Promise<void> {
		const embed = Bot.embed(
			{ title: 'Help', description: 'Helps you learn the commands' },
			interaction
		);

		await Promise.allSettled(
			client.modules.map(async (module) => {
				let field: string = '';
				for (const command of module.commands.values()) {
					field = field.concat(
						`\`${command.name} (${
							(await command.isEnabled(client, interaction.guild))
								? 'ENABLED'
								: 'DISABLED'
						})\` - ${command.help}\n`
					);
				}
				embed.addField(
					`${module.displyName} - ${
						(await module.isEnabled(client, interaction.guild))
							? 'ENABLED'
							: 'DISABLED'
					}`,
					field
				);
			})
		);

		interaction.reply({ ephemeral: true, embeds: [embed] });
	}
}
