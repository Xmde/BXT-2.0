module.exports = {
	apps: [
		{
			name: 'BXT',
			script: 'yarn start',
			interpreter: 'bash',
			watch: true,
			restart_delay: 5000,
			log_date_format: 'YYYY-MM-DDTHH:mm:ss',
		},
	],
};
