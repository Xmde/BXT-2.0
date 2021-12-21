// Simple module for general commands
import { Bot } from '../../client/Client';
import { BotModule } from '../../interfaces/Module';
import {
	ButtonInteraction,
	Guild,
	GuildMember,
	MessageActionRow,
	MessageAttachment,
	MessageButton,
	MessageEmbed,
} from 'discord.js';
import Captcha from 'captcha-generator-alphanumeric';
import EventEmitter from 'events';
import { Model } from 'mongoose';
import { DBModGuild } from '../../database/models/ModGuild';

export default class FunModule extends BotModule {
	constructor(client: Bot) {
		super('captcha', __dirname);
		client.logger.info(`Initializing module ${this.displyName}`);

		this.addSetting('role', '').addRoleOption((opt) =>
			opt
				.setName('Role')
				.setDescription(
					'The role the user recives after completing the captcha'
				)
				.setRequired(true)
		);

		client.on('guildMemberAdd', async (member) => {
			const ModGuildSchema: Model<DBModGuild> = client.db.load('modguild');
			const modGuild = await ModGuildSchema.findOne({
				guildId: member.guild.id,
			});
			if (!modGuild) return;
			if (!modGuild.getModule('captcha')?.enabled) return;
			if (!modGuild.getModuleSettings('captcha', 'role')?.value) return;
			const role = member.guild.roles.cache.find(
				(r) => r.name === modGuild.getModuleSettings('captcha', 'role')?.value
			);
			if (!role) return;
			if (this.doCaptcha(client, member)) {
				member.roles.add(role);
			} else {
				member.kick('Failed captcha');
			}
		});
	}

	public async doCaptcha(client: Bot, user: GuildMember): Promise<boolean> {
		const endEvent = new EventEmitter();
		const captcha = new Captcha();

		// Create the Message Embed
		const embed = new MessageEmbed()
			.setImage('attachment://captcha.png')
			.setAuthor('Captcha Bot', (await client.application!.fetch()!).iconURL()!)
			.setColor('#0099ff')
			.setTitle('Please Complete the Following Captcha')
			.setDescription(
				'The server you are trying to join requires that you compleate this simple captcha.' +
					' Press the correct button below the generated captcha to be authenticated.'
			);

		// buttons contains the buttons to be displayed
		// Labels contain the labels for the buttons
		const buttons: MessageButton[] = [];
		const labels: string[] = [captcha.value];

		// Generates 4 more random labels using the subset of the captcha value
		// Cheks to make sure the labels are not duplicates
		for (let i = 0; i < 4; i++) {
			while (true) {
				const label = this.scramble(captcha.value);
				if (!labels.includes(label)) {
					labels.push(label);
					break;
				}
			}
		}

		// Creates all the buttons from the labels
		for (const label of labels) {
			buttons.push(
				new MessageButton()
					.setCustomId(label)
					.setLabel(label)
					.setStyle('PRIMARY')
			);
		}

		// Creates a DM with the user
		const dm = await user.createDM();
		try {
			const sentMsg = await dm.send({
				embeds: [embed],
				files: [new MessageAttachment(captcha.PNGStream, 'captcha.png')],
				components: [
					new MessageActionRow().addComponents(this.shuffle(buttons)),
				],
			});
			// Create a collector for handling the users response
			const collector = sentMsg.createMessageComponentCollector({
				componentType: 'BUTTON',
				time: 30000,
			});

			collector.once('collect', async (interaction: ButtonInteraction) => {
				interaction.deferUpdate();
				sentMsg.delete();
				// Check if the user pressed the correct button
				if (interaction.customId === captcha.value) {
					// Captcha passed
					dm.send({
						embeds: [
							new MessageEmbed()
								.setTitle('Congratulations! You Passed The Captcha')
								.setDescription(
									'You should now be able to join the server! Hope you enjoy your stay!'
								)
								.setColor('#0099ff')
								.setAuthor(
									'Captcha Bot',
									(await client.application!.fetch()!).iconURL()!
								),
						],
						components: [],
						files: [],
					});
					collector.stop();
					endEvent.emit('end', true);
				} else {
					// Captcha failed
					dm.send({
						embeds: [
							new MessageEmbed()
								.setTitle('Sorry! You Failed The Captcha')
								.setDescription(
									'Unfortunatly you failed the captcha. Please type !captcha to try again!'
								)
								.setColor('#ff0000')
								.setAuthor(
									'Captcha Bot',
									(await client.application!.fetch()!).iconURL()!
								),
						],
						components: [],
						files: [],
					});
					collector.stop();
					endEvent.emit('end', false);
				}
			});

			// If the collecor timesout, Send a message to the user
			collector.once('end', async (_, reason) => {
				if (reason === 'time') {
					sentMsg.delete();
					dm.send({
						embeds: [
							new MessageEmbed()
								.setTitle(
									'Unfortunatly you took too long to complete the captcha'
								)
								.setDescription(
									'You took too long to complete the captcha. Please type !captcha to try again!'
								)
								.setColor('#ff0000')
								.setAuthor(
									'Captcha Bot',
									(await client.application!.fetch()!).iconURL()!
								),
						],
						components: [],
						files: [],
					});
					endEvent.emit('end', false);
				}
			});
			return await new Promise(function (res) {
				endEvent.once('end', res);
			});
		} catch (err) {
			// If there was an error with the msg sending then log it
			// And send a reply to the user
			(client as Bot).logger.error(err);
			dm.send('An error occured while trying to send the captcha.');
			return false;
		}
	}

	// Function which scrambles an input string
	private scramble(input: string): string {
		const aa = input.split('');
		const nn = aa.length;

		for (let i = nn - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const tmp = aa[i];
			aa[i] = aa[j];
			aa[j] = tmp;
		}
		return aa.join('');
	}

	// Function which shuffles an array
	private shuffle(array: any[]) {
		let currentIndex = array.length;
		let randomIndex;

		// While there remain elements to shuffle...
		while (currentIndex !== 0) {
			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			// And swap it with the current element.
			[array[currentIndex], array[randomIndex]] = [
				array[randomIndex],
				array[currentIndex],
			];
		}

		return array;
	}
}
