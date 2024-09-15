import { buildLorenzTransform, Transform } from './transform.js';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const transform = new Transform();
const temporary = new Transform();

const project = (v) => {
	const res = temporary.applyTo(v);
	res[0] = canvas.width  * 0.5 + res[0];
	res[1] = canvas.height * 0.5 - res[1];
	return res;
};

const invProject = ([ x, y ]) => {
	const cx = canvas.width  * 0.5;
	const cy = canvas.height * 0.5;
	const res = [ x - cx, cy - y ];
	temporary.invert().applyTo(res, res);
	return res;
};

const vecDist = ([ ax, ay ], [ bx, by ]) => {
	return Math.sqrt((ax - bx)**2 + (ay - by)**2);
};

const lines = [];
const points = [];
const all = [];

let mouse = [ 0, 0 ];

const solveAngle = (adj, opp) => {
	return Math.acos(adj/Math.sqrt(adj**2 + opp**2)) * (opp < 0 ? -1 : 1);
};

const render = () => {

	ctx.fillStyle = '#222';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	for (const { a, b, color } of lines) {
		const [ ax, ay ] = project(a);
		const [ bx, by ] = project(b);
		ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(ax, ay);
		ctx.lineTo(bx, by);
		ctx.stroke();
	}

	for (const { pos, color } of points) {
		const [ x, y ] = project(pos);
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(x, y, 3, 0, Math.PI*2);
		ctx.fill();
	}

	ctx.strokeStyle = '#777';

	if (startClick?.line) {
		const { a, b } = startClick.line;
		const [ ax, ay ] = project(a);
		const [ bx, by ] = project(b);
		const dx = bx - ax;
		const dy = by - ay;
		const angle = (solveAngle(-dy, dx) / Math.PI * 180).toFixed(2);
		ctx.fillStyle = '#fff';
		ctx.font = '14px monospace';
		ctx.textBaseline = 'top';
		ctx.textAlign = 'left';
		ctx.beginPath();
		ctx.fillText(angle + '°', 10, 10);
	}

	const [ mx, my ] = mouse;
	ctx.beginPath();
	ctx.moveTo(mx, 0);
	ctx.lineTo(mx, canvas.height);
	ctx.moveTo(0, my);
	ctx.lineTo(canvas.width, my);
	ctx.stroke();
};

const input = document.querySelector('input');

input.addEventListener('input', () => {
	const factor = 2 ** input.value;
	const t = buildLorenzTransform(factor);
	transform.apply(t, temporary);
	render();
});

input.addEventListener('change', () => {
	transform.set(temporary);
	input.value = 0;
});

canvas.addEventListener('dblclick', (e) => {
	const pos = invProject([ e.offsetX, e.offsetY ]);
	const color = '#0f7';
	const point = { pos, color };
	points.push(point);
	all.push(point);
	render();
});

let startClick;
canvas.addEventListener('mousedown', (e) => {
	if (e.button !== 0) {
		return;
	}
	const mouse = [ e.offsetX, e.offsetY ];
	const pos = invProject(mouse);
	startClick = { mouse, pos, line: null };
});

canvas.addEventListener('mousemove', (e) => {
	mouse = [ e.offsetX, e.offsetY ];
	if (!startClick) {
		render();
		return;
	}
	if (!(e.buttons & 1)) {
		startClick = null;
		render();
		return;
	}
	const pos = invProject(mouse);
	if (!startClick.line) {
		const dist = vecDist(startClick.mouse, mouse);
		if (dist < 5) {
			render();
			return;
		}
		const line = { a: startClick.pos, b: pos, color: '#fff' };
		lines.push(line);
		all.push(line);
		startClick.line = line;
	}
	if (!e.ctrlKey) {
		startClick.line.b = pos;
		render();
		return;
	}
	const [ sx, sy ] = startClick.mouse;
	const dx = e.offsetX - sx;
	const dy = e.offsetY - sy;
	const len = Math.sqrt(dx**2 + dy**2);
	const step = Math.PI / 4 / 3;
	const angle = Math.round(solveAngle(-dy, dx) / step) * step;
	const vx = sx + Math.sin(angle) * len;
	const vy = sy - Math.cos(angle) * len;
	startClick.line.b = invProject([ vx, vy ]);
	render();
});

canvas.addEventListener('mouseup', (e) => {
	if (e.button !== 0) return;
	if (!startClick) return;
	startClick = null;
	render();
});

canvas.addEventListener('wheel', (e) => {
	const scale = 1 - e.deltaY*0.001;
	const cx = canvas.width * 0.5;
	const cy = canvas.height * 0.5;
	const dx = e.offsetX - cx;
	const dy = e.offsetY - cy;
	transform.translate([ -dx, dy ], transform);
	transform.scale(scale, scale, transform);
	transform.translate([ dx, -dy ], transform);
	temporary.set(transform);
	render();
});

window.addEventListener('keydown', e => {
	if (e.code === 'Backspace') {
		const item = all.pop();
		if (lines.at(-1) === item) lines.pop();
		if (points.at(-1) === item) points.pop();
		render();
	}
});

render();
