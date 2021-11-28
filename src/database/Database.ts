import { Collection } from 'discord.js';
import mongoose, { Model } from 'mongoose';
import glob from 'glob';
import { promisify } from 'util';
import consolaGlobalInstance from 'consola';

const globPromise = promisify(glob);

// Class for Database handeling
// Logins to the database and get Models
// Each model is defined in a seperate .ts file
// Models are in the models folder
// This auto imports models and sets them up.
class Database {
	private models: Collection<string, Model<any>> = new Collection();
	public constructor(mongoURI: string) {
		mongoose.connect(mongoURI);
	}

	public async init(): Promise<void> {
		const modelFiles = await globPromise(`${__dirname}/models/*{.ts,.js}`);
		modelFiles.forEach(async (value: string) => {
			const model = await import(value);
			consolaGlobalInstance.info(`Loaded model ${model.name}`);
			this.models.set(model.name, model.Model);
		});
	}

	public load(name: string): Model<any> {
		return this.models.get(name);
	}
}

export { Database };
