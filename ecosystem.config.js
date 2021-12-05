module.exports = {
	apps: [
		{
			name: 'BXT_Beta',
			script: 'yarn',
			args: ['start'],
			instance_var: 'INSTANCE_ID',
			watch: true,
			restart_delay: 5000,
			log_date_format: 'YYYY-MM-DDTHH:mm:ss',
			post_update: ['yarn build'],
		},
	],
};
