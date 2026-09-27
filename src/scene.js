import * as THREE from 'three';
import { createFlacon, redrawMedallion, FULL } from './flacon.js';
import { createStudioEnv } from './studio.js';
import { createAlchemy } from './alchemy.js';

// Fixed, full-screen WebGL layer: the flacon travels between sections and,
// in the Alchemy section, fills with the essence of real flowers.
// `pose` is the scroll-driven target (x / y as fractions of the half viewport).
export function createScene(canvas) {
  // Opaque canvas in the page colour: transmissive glass composites correctly
  // (an alpha canvas makes glass look milky), and it is invisible against the page.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor('#0b0907', 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  scene.environment = createStudioEnv(renderer);

  const key = new THREE.DirectionalLight('#ffe6c4', 2.2);
  key.position.set(-3, 5, 6);
  const rim = new THREE.DirectionalLight('#ffd08a', 2.5);
  rim.position.set(4, 2, -4);
  scene.add(key, rim, new THREE.HemisphereLight('#fff4e6', '#1a120a', 0.35));

  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);
  scene.add(root);

  const flacon = createFlacon();
  spin.add(flacon.group);

  // Warm backlight behind the flacon. It is opaque and fades exactly into the
  // page colour, so the glass refracts it (transparent layers are invisible to
  // refraction) while its edges stay seamless against the page.
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: { uO: { value: 1 }, uBg: { value: new THREE.Color('#0b0907') }, uC: { value: new THREE.Color('#62391a') } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform float uO; uniform vec3 uBg, uC; varying vec2 vUv;
        void main(){
          float d = distance(vUv, vec2(.5));
          float g = pow(smoothstep(.5, 0., d), 1.6) * uO;
          gl_FragColor = vec4(mix(uBg, uC, g), 1.);
          #include <colorspace_fragment>
        }`,
      depthWrite: false,
    }),
  );
  halo.position.set(0, 0.25, -3);
  halo.scale.set(9, 10, 1);
  halo.renderOrder = -1;
  root.add(halo);

  const alchemy = createAlchemy();
  root.add(alchemy.group);

  // --- Gold dust with a few out-of-focus bokeh motes --------------------------
  const N = 650;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N), size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 11;
    pos[i * 3 + 2] = -7 + Math.random() * 9.5;
    seed[i] = Math.random();
    size[i] = Math.random() < 0.06 ? 5 + Math.random() * 6 : 0.4 + Math.random() * 1.4;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const pMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, uLift: { value: 0 }, uColor: { value: new THREE.Color('#e8c47f') } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPR; uniform float uLift;
      attribute float aSeed; attribute float aSize;
      varying float vAlpha; varying float vSoft;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.25 + aSeed * 6.2831) * 0.35 + uLift * (0.3 + aSeed * 0.9);
        p.x += cos(uTime * 0.2 + aSeed * 12.0) * 0.3;
        p.y = mod(p.y + 5.5, 11.0) - 5.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR * (28.0 / -mv.z);
        vSoft = step(4.0, aSize);
        vAlpha = (0.25 + 0.75 * abs(sin(uTime * 0.5 + aSeed * 20.0))) * mix(1.0, 0.12, vSoft);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vAlpha; varying float vSoft;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = mix(pow(smoothstep(0.5, 0.0, d), 2.0), smoothstep(0.5, 0.42, d) * 0.7 + smoothstep(0.45, 0.0, d) * 0.3, vSoft);
        gl_FragColor = vec4(uColor, a * vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(pGeo, pMat);
  scene.add(dust);

  // --- State ----------------------------------------------------------------
  const pose = { x: 0.42, y: 0, rotY: 0, rotZ: 0.1, scale: 0.95, opacity: 1 };
  const cur = { ...pose };
  const mouse = { x: 0, y: 0 }, mouseL = { x: 0, y: 0 };
  const intro = { v: 0 };
  const alch = { enter: 0, p: 0 };           // set from ScrollTrigger in main.js
  let amber = new THREE.Color('#d9861a');
  const blend = [new THREE.Color('#e0708f'), new THREE.Color('#f0c27a'), amber];
  let halfW = 1, halfH = 1, baseScale = 1, mobile = false, lastOpacity = -1, lift = 0, wasInZone = false;
  const tmp = new THREE.Color(), anchor = new THREE.Vector3();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    mobile = camera.aspect < 0.8;
    baseScale = mobile ? 0.66 : camera.aspect < 1.2 ? 0.8 : 1;
    pMat.uniforms.uPR.value = renderer.getPixelRatio();
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const smooth = THREE.MathUtils.smoothstep;
  function applyAlchemy(t) {
    const A = alch.p;
    const inZone = alch.enter > 0 && A < 1;
    if (inZone) {
      flacon.setLevel(FULL * smooth(A, 0.36, 0.86));
      const k = smooth(A, 0.36, 0.9) * 2;
      tmp.copy(blend[0]).lerp(blend[1], Math.min(1, k)).lerp(blend[2], Math.max(0, k - 1));
      flacon.liquidMat.color.copy(tmp);
      flacon.liquidMat.emissive.copy(tmp);
      flacon.setLift(1.1 * (smooth(A, 0.2, 0.3) - smooth(A, 0.86, 0.95)));
      wasInZone = true;
    } else if (wasInZone) {
      flacon.setLevel(FULL);
      flacon.setLift(0);
      flacon.liquidMat.color.copy(amber);
      flacon.liquidMat.emissive.copy(amber);
      wasInZone = false;
    }
    alchemy.update(inZone ? A : 0, t, mobile);
  }

  function update(t, dt) {
    const k = 1 - Math.pow(0.0015, dt);
    for (const key in pose) cur[key] += (pose[key] - cur[key]) * k;
    mouseL.x += (mouse.x - mouseL.x) * k * 0.5;
    mouseL.y += (mouse.y - mouseL.y) * k * 0.5;

    const iv = intro.v;
    root.position.set(cur.x * halfW, cur.y * halfH - (1 - iv) * 0.8, 0);
    root.rotation.set(mouseL.y * 0.08, 0, cur.rotZ);
    root.scale.setScalar(cur.scale * baseScale * (0.35 + 0.65 * iv));

    spin.position.y = Math.sin(t * 0.8) * 0.06;
    spin.rotation.y = cur.rotY + Math.sin(t * 0.3) * 0.45 + mouseL.x * 0.5 - (1 - iv) * Math.PI * 1.5;
    spin.rotation.x = Math.sin(t * 0.6) * 0.035;

    halo.material.uniforms.uO.value = iv;
    dust.position.x = -mouseL.x * 0.25;
    pMat.uniforms.uTime.value = t;
    pMat.uniforms.uLift.value = lift;

    applyAlchemy(t);
    root.updateMatrixWorld(true);
    flacon.update();

    const o = Math.max(0, Math.min(1, cur.opacity));
    if (Math.abs(o - lastOpacity) > 0.002) {
      canvas.style.opacity = o.toFixed(3);
      lastOpacity = o;
    }
    if (o > 0.004) renderer.render(scene, camera);
  }

  // Screen position of each flower (for the DOM labels)
  function flowerScreen(i) {
    const fl = alchemy.flowers[i];
    if (!fl.group.visible || !alchemy.group.visible) return null;
    fl.anchor.getWorldPosition(anchor).project(camera);
    return { x: (anchor.x * 0.5 + 0.5) * window.innerWidth, y: (-anchor.y * 0.5 + 0.5) * window.innerHeight, s: fl.group.scale.x };
  }

  return {
    pose, intro, alch, update, flowerScreen,
    liquidMat: flacon.liquidMat,
    drawLabel: redrawMedallion,
    setLift(v) { lift = v; },
    setAmber(hex) { amber.set(hex); },
    level: () => flacon.getLevel(),
    color(hex) {
      const c = new THREE.Color(hex);
      return { r: c.r, g: c.g, b: c.b };
    },
  };
}
