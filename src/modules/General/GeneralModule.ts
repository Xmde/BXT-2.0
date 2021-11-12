// Simple module for general commands
import { BotModule } from '../module';

export const module = new BotModule('general', __dirname);

export const name = module.name;
export const displyName = module.displyName;
export const info = module.info;
export const commands = module.commands;
