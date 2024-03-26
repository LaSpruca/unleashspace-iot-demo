<script lang="ts">
	import type { Readable, Writable } from 'svelte/store';
	import { writable, get, derived } from 'svelte/store';
	import { LineChart, ScaleTypes, type LineChartOptions } from '@carbon/charts-svelte';
	import type { SubmitRequest } from '$lib/upload';
	import { PUBLIC_SPEEDTEST_URL } from '$env/static/public';

	let running = false;
	let done = false;
	let average = 0;
	let uploaded = false;

	const data: Writable<{ date: Date; value: number; group: string }[]> = writable([]);
	const averages: Readable<{ date: Date; value: number; group: string }[]> = derived(
		[data],
		([data]) => {
			if (data.length < 1) {
				return [];
			}

			let averages = new Array(data.length);
			for (let i = 0; i < data.length; i++) {
				let total = 0;
				for (let j = 0; j <= i; j++) {
					total += data[j].value;
				}
				averages.push({ ...data[i], value: total / (i + 1) });
			}
			return averages.filter((x) => typeof x !== 'undefined');
		}
	);

	$: average = $averages[$averages.length - 1]?.value ?? 0;

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
		theme: 'g100',
		animations: false,
		legend: {
			enabled: false
		}
	};

	async function runTest() {
		const stream = new EventSource(PUBLIC_SPEEDTEST_URL + "?nocache=" + Math.random());
		stream.addEventListener('message', (event) => {
			running = true;
			const now = Date.now();
			const eventData: string = event.data;

			if (eventData === 'done') {
				stream.close();
				done = true;
				return;
			}

			const line = eventData.split('#')[0];
			const { time: requestTime } = JSON.parse(line);
			const ms = Math.max(now - requestTime, 1);
			const amountData = (eventData.length + 8) / 125000;
			const mbpms = amountData / ms;
			const speed = mbpms * 1000;

			console.log({ ms, amountData, mbpms, speed });

			data.update((data) => {
				data.push({ date: new Date(), value: speed, group: 'Download' });
				return data;
			});
		});
	}

	async function uploadResults() {
		if (!navigator.geolocation) {
			return;
		}
		const location: GeolocationPosition = await new Promise((res, rej) =>
			navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true })
		);

		const request: SubmitRequest = {
			averageDownload: parseFloat(average.toFixed(2)),
			date: get(data)[get(data).length - 1].date,
			lat: location.coords.latitude,
			long: location.coords.longitude,
			alt: 27
		};

		await fetch('/upload-results', { method: 'POST', body: JSON.stringify(request) });
		uploaded = true;
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
	{:else if uploaded}
		<span class="text-3xl font-bold text-cie-orange">Uploaded</span>
		<span class="text-xl text-white">Check the big screen</span>
	{:else}
		{#if !done}
			<span class="text-3xl font-bold text-white">Running test</span>
		{:else}
			<span class="text-3xl font-bold text-white">Done</span>
		{/if}
		<span class="text-xl font-bold text-white"
			>Speed: <span class="text-cie-orange">{average.toFixed(2)} mbps</span></span
		>

		<LineChart data={$averages} {options} />
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
