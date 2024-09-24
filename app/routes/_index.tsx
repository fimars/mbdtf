import {
	Button,
	Card,
	CardFooter,
	Input,
	Image as NextImage,
	Skeleton,
} from "@nextui-org/react";
import type { MetaFunction } from "@remix-run/node";
import { useRef } from "react";
import { UploadIcon } from "~/primitives/upload.icon";

export const meta: MetaFunction = () => {
	return [
		{ title: "MBDTF" },
		{ name: "description", content: "my beautiful dark twisted fantasy" },
	];
};

export default function Index() {
	return (
		<div className="flex flex-col h-screen items-center justify-center gap-9">
			<DropZone />
			<PoweredBy />
		</div>
	);
}

function DropZone() {
	const fi = useRef<HTMLInputElement>(null);

	return (
		<Card isFooterBlurred radius="lg">
			<canvas id="mbdtf" className="size-80 block" />

			<CardFooter className="gap-4">
				<Input
					onChange={(ev) => {
						const f = ev.target.files?.item(0);
						if (f) {
							analyzeImageBlocks(f);
						}
					}}
					className="w-36"
					ref={fi}
					type="file"
				/>
				<Button
					onClick={() => {
						fi.current?.click();
					}}
					color="success"
					endContent={<UploadIcon />}
				>
					Take a photo
				</Button>
			</CardFooter>
		</Card>
	);
}

function PoweredBy() {
	return (
		<div className="flex flex-col items-center gap-16">
			<header className="flex flex-col items-center gap-1">
				<h1 className="leading text-2xl font-bold text-gray-800 dark:text-gray-100">
					Powered by <span className="sr-only">Remix</span>
				</h1>
				<div className="h-[144px] w-[434px]">
					<img
						src="/logo-light.png"
						alt="Remix"
						className="block w-full dark:hidden"
					/>
					<img
						src="/logo-dark.png"
						alt="Remix"
						className="hidden w-full dark:block"
					/>
				</div>
			</header>
		</div>
	);
}

function analyzeImageBlocks(file: File) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = img.width;
			canvas.height = img.height;
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			const ctx = canvas.getContext("2d")!;
			ctx.drawImage(img, 0, 0);

			const numBlocksX = 10;
			const numBlocksY = 10;

			const blockData = [];

			// 统计每种颜色出现的频率
			const colorFrequency = new Map();

			for (let x = 0; x < numBlocksX; x++) {
				for (let y = 0; y < numBlocksY; y++) {
					const imageData = ctx.getImageData(
						(x * canvas.width) / numBlocksX,
						(y * canvas.height) / numBlocksY,
						canvas.width / numBlocksX,
						canvas.height / numBlocksY,
					);

					const pixelCount = imageData.data.length / 4;
					let redSum = 0;
					let greenSum = 0;
					let blueSum = 0;

					for (let i = 0; i < imageData.data.length; i += 4) {
						redSum += imageData.data[i];
						greenSum += imageData.data[i + 1];
						blueSum += imageData.data[i + 2];
						// fill
						const key = `${imageData.data[i]},${imageData.data[i + 1]},${imageData.data[i + 2]}`;
						colorFrequency.set(key, (colorFrequency.get(key) || 0) + 1);
					}

					blockData.push({
						x,
						y,
						averageRed: redSum / pixelCount,
						averageGreen: greenSum / pixelCount,
						averageBlue: blueSum / pixelCount,
					});
				}
			}
			// 获取 id 为 "mbdtf" 的 canvas 元素
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			const outputCanvas = document.getElementById(
				"mbdtf",
			)! as HTMLCanvasElement;
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			const outputCtx = outputCanvas.getContext("2d")!;
			const fillSize = 500;

			outputCanvas.width = 600 + fillSize * 2;
			outputCanvas.height = 600 + fillSize * 2;

			// 绘制周围的纯色填充
			// 找到前 10 个最常见的颜色
			const sortedColors = Array.from(colorFrequency.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 10)
				.map(([color]) => color.split(",").map(Number));
			// 计算这 10 个颜色的平均值
			const [avgRed, avgGreen, avgBlue] = sortedColors
				.reduce(
					([redSum, greenSum, blueSum], [red, green, blue]) => [
						redSum + red,
						greenSum + green,
						blueSum + blue,
					],
					[0, 0, 0],
				)
				.map((sum: number) => Math.round(sum / 10));
			outputCtx.fillStyle = `rgb(${avgRed}, ${avgGreen}, ${avgBlue})`;
			outputCtx.fillRect(0, 0, outputCanvas.width, fillSize);
			outputCtx.fillRect(0, 0, fillSize, outputCanvas.height);
			outputCtx.fillRect(
				0,
				outputCanvas.height - fillSize,
				outputCanvas.width,
				fillSize,
			);
			outputCtx.fillRect(
				outputCanvas.width - fillSize,
				0,
				fillSize,
				outputCanvas.height,
			);

			for (let i = 0; i < blockData.length; i++) {
				const block = blockData[i];
				const x =
					fillSize + (block.x * (outputCanvas.width - fillSize * 2)) / 10;
				const y =
					fillSize + (block.y * (outputCanvas.height - fillSize * 2)) / 10;
				outputCtx.fillStyle = `rgb(${block.averageRed}, ${block.averageGreen}, ${block.averageBlue})`;
				outputCtx.fillRect(
					x,
					y,
					(outputCanvas.width - fillSize * 2) / 10,
					(outputCanvas.height - fillSize * 2) / 10,
				);
			}

			resolve(blockData);
		};
		img.onerror = reject;
		img.src = URL.createObjectURL(file);
	});
}
