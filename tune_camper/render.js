// Render the camper on the truck, roof down and roof up, with three.js in
// headless Chromium. Usage: THREE_DIR=<node_modules/three> node render.js <dir>
const { chromium } = require('playwright');
const fs = require('fs');
const dir = process.argv[2] || '.';
const threeDir = process.env.THREE_DIR || require('path').dirname(require.resolve('three/package.json'));
const b64 = f => fs.readFileSync(`${dir}/${f}`).toString('base64');
const html = `<html><body style="margin:0;background:#fff">
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
const loader = new STLLoader();
const geo = s => loader.parse(Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer);
const truck = geo('${b64('_truck.stl')}');
const states = { 'Roof down': geo('${b64('_camper_closed.stl')}'), 'Roof up': geo('${b64('_camper_open.stl')}') };
const views = [['rear 3/4', [2.2, -1.6, 0.9]], ['side', [0.001, -3, 0.15]]];
for (const [state, cg] of Object.entries(states)) for (const [vname, d] of views) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(700, 470); r.setClearColor(0xffffff);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const l = new THREE.DirectionalLight(0xffffff, 1.5); l.position.set(1, -2, 3); scene.add(l);
  scene.add(new THREE.Mesh(truck, new THREE.MeshStandardMaterial({ color: 0x5b6470, roughness: 0.6 })));
  scene.add(new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.7 })));
  const grid = new THREE.GridHelper(8000, 16, 0xcccccc, 0xe6e6e6); grid.rotation.x = Math.PI / 2; scene.add(grid);
  const c = new THREE.OrthographicCamera(-3600, 3600, 2420, -2420, -20000, 20000);
  c.up.set(0, 0, 1);
  const t = new THREE.Vector3(-1100, 0, 1500);
  c.position.copy(t.clone().add(new THREE.Vector3(...d).normalize().multiplyScalar(8000)));
  c.lookAt(t); r.render(scene, c);
  const fig = document.createElement('figure');
  fig.style.cssText = 'display:inline-block;margin:0;font:16px sans-serif;text-align:center';
  fig.innerHTML = '<figcaption>' + state + ', ' + vname + '</figcaption>';
  fig.prepend(r.domElement); document.body.appendChild(fig);
}
document.title = 'done';
</script></body></html>`;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1420, height: 1020 } });
  p.on('pageerror', e => console.log(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', route => {
    const rel = route.request().url().split('three@0.160.0/')[1];
    route.fulfill({ path: `${threeDir}/${rel}`, contentType: 'text/javascript' });
  });
  await p.setContent(html);
  await p.waitForFunction(() => document.title === 'done', null, { timeout: 120000 });
  await p.screenshot({ path: `${dir}/preview.png`, fullPage: true });
  await b.close();
})();
