import { CommandInteraction, CacheType, Guild } from 'discord.js';
import { Bot } from '../../../client/Client';
import { Command } from '../../../interfaces/Command';
import { BotModule } from '../../../interfaces/Module';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default class PingCommand extends Command {
	constructor(module: BotModule) {
		super({
			name: 'roll',
			help: 'Rolls the Given number of dice',
			info: 'Rolls a Dice',
			module,
		});
		this.data
			.addIntegerOption((dice) => {
				return dice
					.setName('dice')
					.setDescription('The number of dice to roll')
					.addChoices([
						['1', 1],
						['2', 2],
						['3', 3],
						['4', 4],
						['5', 5],
						['6', 6],
					]);
			})
			.addIntegerOption((sides) => {
				return sides
					.setName('sides')
					.setDescription('The number of sides on the dice')
					.addChoices([
						['4', 4],
						['6', 6],
						['8', 8],
						['10', 10],
						['12', 12],
						['20', 20],
					]);
			});
	}

	public async run(
		client: Bot,
		interaction: CommandInteraction<CacheType>
	): Promise<void> {
		interaction.deferReply({ ephemeral: true });
		await delay(Math.floor(Math.random() * 1000) + 1000);
		const sides = interaction.options.getInteger('sides') | 6;
		const dice = interaction.options.getInteger('dice') | 1;
		// Roll the dice
		const rolls = [];
		for (let i = 0; i < dice; i++) {
			rolls.push(Math.floor(Math.random() * sides) + 1);
		}
		// Send the results
		interaction.editReply({
			embeds: [
				client.embed(
					{
						description: `Roll Resaults ${rolls.join(' | ')}`,
						title: `You Rolled ${rolls.reduce(
							(a, r) => a + r
						)} (D: ${dice}, S: ${sides})`,
					},
					interaction
				),
			],
		});
	}
}
