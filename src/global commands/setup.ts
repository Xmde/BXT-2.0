// Global Command Setup.
// Sets up the database for the guild
// TODO: Add options so user can enable and disable modules and commands
import { GlobalRunFunction } from '../interfaces/Command';
import { setUpGuild } from '../events/Guild Events/GuildJoin';
import { MessageActionRow, MessageSelectMenu, MessageButton } from 'discord.js';
import glob from 'glob';
import { promisify } from 'util';
import { Module } from '../interfaces/Module';

const globPromise = promisify(glob);

export const name: string = 'setup';

export const run: GlobalRunFunction = async (client, message, args) => {
	if (message.guild.ownerId !== message.author.id) {
		message.channel.send(
			client.messageEmbed(
				{ description: 'You must be the Guild Owner to run this Command!' },
				message
			)
		);
	}
	const ModGuildSchema = client.db.load('modguild');
	if (!ModGuildSchema.findOne({ guildId: message.guildId }))
		setUpGuild(client, message.guildId);

	const moduleSelectMenu = await generateModuleSelectMenu();

	const response = await message.reply({
		content: 'BXT Setup Menu',
		components: [moduleSelectMenu],
	});

	const selectMenuCollector = response.createMessageComponentCollector({
		componentType: 'SELECT_MENU',
		time: 60000,
	});

	selectMenuCollector.on('collect', (i) => {
		console.log(i.values[0]);
		if (i.user.id !== message.author.id)
			i.reply({ content: `This isn't for you`, ephemeral: true });
	});
};

async function generateModuleSelectMenu(): Promise<MessageActionRow> {
	const moduleSelectMenu = new MessageSelectMenu()
		.setCustomId('module')
		.setPlaceholder('Select a Module');
	const moduleFiles = await globPromise(
		`${__dirname}/../modules/*/*Module{.ts,.js}`
	);
	await Promise.allSettled(
		moduleFiles.map(async (value: string) => {
			const file: Module = await import(value);
			moduleSelectMenu.addOptions([
				{
					label: file.displyName,
					description: file.info,
					value: file.name,
				},
			]);
		})
	);

	return new MessageActionRow().addComponents(moduleSelectMenu);
}
