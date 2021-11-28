// Interface for the config file
export interface Config {
	token: string;
	mongoURI: string;
	twitch: {
		clientID: string;
		clientSecret: string;
	};
	youtube: {
		callbackurl: string;
		callbackport: number;
		apiKey: string;
	};
}
