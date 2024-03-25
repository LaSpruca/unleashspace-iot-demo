/** @type {import('tailwindcss').Config}*/
const config = {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			colors: {
				'cie-orange': 'rgb(255, 100, 0)'
			}
		}
	},

	plugins: []
};

module.exports = config;
