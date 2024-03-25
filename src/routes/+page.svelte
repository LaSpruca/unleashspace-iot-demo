<script lang="ts">
	import type { Writable } from 'svelte/store';
	import { writable, get } from 'svelte/store';
	import { LineChart, ScaleTypes, type LineChartOptions } from '@carbon/charts-svelte';
	import type { SubmitRequest } from '$lib/upload';

	let running = false;
	let done = false;

	const data: Writable<{ date: Date; value: number; group: string }[]> = writable([]);

	let options: LineChartOptions = {
		title: 'Downlead Speed',
		axes: {
			bottom: {
				mapsTo: 'date',
				scaleType: ScaleTypes.TIME,
				visible: false
			},
			left: {
				mapsTo: 'value',
				title: 'Download (mbps)',
				scaleType: ScaleTypes.LINEAR
			}
		},
		curve: 'curveMonotoneX',
		height: '250px',
		width: '75%',
		theme: 'g100'
	};

	$: {
		if ($data.length > 1) {
			options.axes!.bottom!.domain = [$data[0].date, $data[$data.length - 1].date];
		}
	}

	async function runTest() {
		const request = await fetch('/speedtest/down');
		const body = request.body!;
		const reader = body.getReader();
		const textEncoder = new TextDecoder();
		running = true;
		done = false;

		for (;;) {
			const response = await reader.read();
			const now = Date.now();

			const content = textEncoder.decode(response.value);
			if (response.done || content.endsWith('done')) {
				done = true;
				console.log('Finnished');

				return;
			}

			if (typeof content === 'undefined') {
				continue;
			}

			let responseBody;

			for (const line of content.split('\n')) {
				if (line.startsWith('{')) {
					console.log(line);
					try {
						responseBody = JSON.parse(line);
						const time = Math.max(now - responseBody.time, 1000) / 1000;
						console.log(now - responseBody.time);

						const speed = (response.value.length * 8) / 1000 / time;
						console.log(speed);
						data.update((data) => {
							data.push({ date: new Date(), value: speed, group: 'Download' });
							return data;
						});
					} catch (ex) {
						console.error('Server sent invalid JSON', ex);
					} finally {
						break;
					}
				}
			}
		}
	}

	async function uploadResults() {
		if (!navigator.geolocation) {
			return;
		}
		const location: GeolocationPosition = await new Promise((res, rej) =>
			navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true })
		);

		const request: SubmitRequest = {
			averageDownload:
				get(data).reduce((collector, { value }) => collector + value, 0) / get(data).length,
			date: get(data)[get(data).length - 1].date,
			lat: location.coords.latitude,
			long: location.coords.longitude,
			alt: 27
		};

		await fetch('/upload-results', { method: 'POST', body: JSON.stringify(request) });
	}
</script>

<main class="flex h-screen flex-col items-center justify-center gap-2 bg-black">
	{#if !running}
		<button
			class="relative flex h-32 w-32 items-center justify-center rounded-full border border-cie-orange"
			on:click={runTest}
		>
			<div class="absolute h-full w-full animate-ping rounded-full border border-cie-orange"></div>
			<span class="z-10 text-5xl font-bold text-cie-orange">Go</span>
		</button>
	{:else}
		{#if !done}
			<span class="text-3xl font-bold text-white">Running test</span>
		{:else}
			<span class="text-3xl font-bold text-white">Done</span>
		{/if}

		<LineChart data={$data} {options} />
		<button
			class="text-bold rounded bg-cie-orange p-5 text-xl font-bold text-white transition-all duration-100 disabled:grayscale"
			on:click={uploadResults}
			disabled={!done}>Upload</button
		>
	{/if}
</main>

<style>
	.animate-ping {
		animation-duration: 2s !important;
	}
</style>
