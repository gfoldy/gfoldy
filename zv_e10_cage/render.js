// Render the cage assembly with three.js in headless Chromium.
// Usage: node render.js <dir>   (reads cage_assembly.stl, _camera_block.stl)
const { chromium } = require('playwright');
const fs = require('fs');
const dir = process.argv[2] || '.';
// three.js is served from a local node_modules (THREE_DIR) instead of the CDN
const threeDir = process.env.THREE_DIR || require('path').dirname(require.resolve('three/package.json'));
const b64 = f => fs.readFileSync(`${dir}/${f}`).toString('base64');
const html = `<html><body style="margin:0;background:#fff">
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
const W = 700, H = 520;
const loader = new STLLoader();
const geo = s => loader.parse(Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer);
const cage = geo('${b64('cage_assembly.stl')}'), cam = geo('${b64('_camera_block.stl')}');
const views = [['Front / lens side', [1, 2.2, 0.9]], ['Back / screen side', [-1.2, -2, 0.8]],
               ['Grip side', [2.5, 0.4, 0.5]], ['Underside', [0.6, 0.9, -2]]];
for (const [title, d] of views) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(W, H); r.setClearColor(0xffffff);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(d[0] + 1, d[1] - 1, d[2] + 2); scene.add(l);
  scene.add(new THREE.Mesh(cage, new THREE.MeshStandardMaterial({ color: 0xb8bec8, metalness: 0.3, roughness: 0.5 })));
  const cm = new THREE.Mesh(cam, new THREE.MeshStandardMaterial({ color: 0x223344, transparent: true, opacity: 0.25, depthWrite: false }));
  scene.add(cm);
  const c = new THREE.OrthographicCamera(-90, 90, 67, -67, -1000, 1000);
  c.up.set(0, 0, 1);
  const t = new THREE.Vector3(60, 20, 35);
  c.position.copy(t.clone().add(new THREE.Vector3(...d).normalize().multiplyScalar(300)));
  c.lookAt(t);
  r.render(scene, c);
  const fig = document.createElement('figure');
  fig.style.cssText = 'display:inline-block;margin:0;font:16px sans-serif;text-align:center';
  fig.innerHTML = '<figcaption>' + title + '</figcaption>';
  fig.prepend(r.domElement); document.body.appendChild(fig);
}
document.title = 'done';
</script></body></html>`;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1420, height: 1120 } });
  p.on('console', m => console.log(m.text())); p.on('pageerror', e => console.log(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', route => {
    const rel = route.request().url().split('three@0.160.0/')[1];
    route.fulfill({ path: `${threeDir}/${rel}`, contentType: 'text/javascript' });
  });
  await p.setContent(html);
  await p.waitForFunction(() => document.title === 'done', null, { timeout: 120000 });
  await p.screenshot({ path: `${dir}/preview.png`, fullPage: true });
  await b.close();
})();
