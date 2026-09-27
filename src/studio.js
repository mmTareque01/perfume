import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createFlacon, FULL } from './flacon.js';

// A dark photo studio with softboxes and strip lights, baked into an
// environment map. Glass looks real when it has real shapes to reflect.
export function createStudioEnv(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.MeshBasicMaterial({ color: '#070605', side: THREE.BackSide })));
  const panel = (w, h, hex, power, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(5, 1.6, '#ffffff', 2.4, [0, 10, 1]);    // overhead softbox
  panel(0.5, 12, '#fff6ea', 5, [-8, 0, 4]);     // left strip
  panel(0.4, 12, '#ffffff', 4, [8, 1, 3]);      // right strip
  panel(6, 6, '#ffcf8a', 0.9, [0, 2, -10]);     // warm back glow
  panel(3, 0.8, '#ffffff', 1.4, [3, -3, 9]);    // low front fill
  panel(1.2, 1.2, '#ffe4c4', 3, [-5, 6, 7]);    // key kicker
  panel(0.3, 10, '#ffffff', 4, [-5, 0, 7]);     // front-left strip: long vertical glint
  panel(0.25, 9, '#fff4e4', 2.2, [6, 1, 6]);    // front-right strip
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.01).texture;
  pmrem.dispose();
  return tex;
}

const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
export const liquidFor = (p) => '#' + mix(p.c1, p.c2, 0.5).getHexString();

// Renders every product as a studio packshot (coloured sweep, reflective floor).
export async function renderShots(products, { width = 640, height = 860 } = {}) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1.6); // supersampled, then displayed smaller for crisp edges
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.environment = createStudioEnv(renderer);
  const key = new THREE.DirectionalLight('#fff1dc', 2.2);
  key.position.set(-3, 5, 6);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(22, width / height, 0.1, 100);
  camera.position.set(0, 0.7, 12.5);
  camera.lookAt(0, 0.25, 0);

  const floorY = -1.7;
  const gradient = {
    uniforms: { uTop: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uCaustic: { value: new THREE.Color() } },
  };
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 26),
    new THREE.ShaderMaterial({
      uniforms: gradient.uniforms,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 uTop, uBottom, uGlow; varying vec2 vUv;
        void main(){
          vec3 col = mix(uBottom, uTop, smoothstep(0.0, 0.9, vUv.y));
          float d = distance(vUv * vec2(1.6, 1.0), vec2(0.8, 0.36));
          col += uGlow * smoothstep(0.42, 0.0, d);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  backdrop.position.set(0, floorY + 13, -7);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShaderMaterial({
      uniforms: gradient.uniforms,
      transparent: true,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 uBottom; uniform vec3 uCaustic; varying vec2 vUv;
        void main(){
          float d = distance(vUv, vec2(0.5));
          float a = mix(0.6, 1.0, smoothstep(0.0, 0.08, d));
          vec3 col = uBottom * mix(0.2, 1.0, smoothstep(0.004, 0.03, d));
          // light focused through the perfume lands on the floor in front of the bottle
          vec2 q = (vUv - vec2(0.5, 0.468)) * vec2(1.0, 1.7);
          float c = smoothstep(0.034, 0.0, length(q)) * 0.7 + smoothstep(0.012, 0.0, length(q - vec2(0.0, 0.004))) * 0.6;
          col += uCaustic * c;
          a = max(a, c);
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY;
  scene.add(backdrop, floor);

  const hero = createFlacon();
  const mirror = createFlacon();
  hero.group.rotation.y = -0.18;
  mirror.group.rotation.y = -0.18;
  mirror.group.scale.y = -1;
  mirror.group.position.y = floorY * 2;
  scene.add(hero.group, mirror.group);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.22, 0.45, 0.86));
  composer.addPass(new OutputPass());

  const shots = {};
  for (const p of products) {
    const liquid = liquidFor(p);
    for (const f of [hero, mirror]) {
      f.setColor(liquid);
      f.setLevel(FULL);
    }
    gradient.uniforms.uBottom.value.set(p.c2).multiplyScalar(0.38);
    gradient.uniforms.uTop.value.set(p.c2).multiplyScalar(0.1);
    gradient.uniforms.uGlow.value.set(p.c1).multiplyScalar(0.3);
    gradient.uniforms.uCaustic.value.set(liquid).multiplyScalar(0.9);
    scene.updateMatrixWorld(true);
    hero.update();
    mirror.update();
    composer.render();
    shots[p.id] = canvas.toDataURL('image/jpeg', 0.9);
    await new Promise((r) => requestAnimationFrame(r));
  }
  composer.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return shots;
}
