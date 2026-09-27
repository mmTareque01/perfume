import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Fixed, full-screen WebGL layer: a glass flacon that travels between sections.
// `pose` is the scroll-driven target (x / y as fractions of the half viewport).
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  const key = new THREE.DirectionalLight('#ffe2b8', 2.4);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight('#e0b46e', 4);
  rim.position.set(-4, 2, -3);
  scene.add(key, rim, new THREE.AmbientLight('#ffffff', 0.15));

  const root = new THREE.Group();
  const bottle = new THREE.Group();
  root.add(bottle);
  scene.add(root);

  // --- Flacon ---------------------------------------------------------------
  const W = 1.6, H = 2.1, D = 0.84;
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.03, transmission: 1, thickness: 1.1, ior: 1.5,
    clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.9, specularIntensity: 0.8,
    attenuationColor: new THREE.Color('#fff1dc'), attenuationDistance: 4,
  });
  bottle.add(new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 6, 0.2), glassMat));

  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: '#e0962c', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1,
    emissive: '#e0962c', emissiveIntensity: 0.1, envMapIntensity: 0.8,
  });
  const LH = 1.42;
  const liquid = new THREE.Mesh(new RoundedBoxGeometry(W - 0.26, LH, D - 0.24, 6, 0.12), liquidMat);
  liquid.position.y = -H / 2 + 0.14 + LH / 2;
  bottle.add(liquid);

  const goldMat = new THREE.MeshStandardMaterial({ color: '#dcb772', metalness: 1, roughness: 0.2, envMapIntensity: 1.5 });
  const facetMat = goldMat.clone();
  facetMat.flatShading = true;

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.2, 48), goldMat);
  neck.position.y = H / 2 + 0.1;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 16, 64), goldMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = H / 2 + 0.2;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.82, 8, 1), facetMat);
  cap.position.y = H / 2 + 0.23 + 0.41;
  cap.rotation.y = Math.PI / 8;
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.48, 0.09, 8), facetMat);
  capTop.position.y = cap.position.y + 0.455;
  capTop.rotation.y = Math.PI / 8;
  bottle.add(neck, collar, cap, capTop);

  // Label (drawn to a canvas once the web fonts are ready)
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 1024;
  labelCanvas.height = 640;
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.08, 0.675),
    new THREE.MeshStandardMaterial({ map: labelTex, transparent: true, metalness: 0.45, roughness: 0.35 }),
  );
  label.position.set(0, -0.14, D / 2 + 0.004);
  bottle.add(label);

  function drawLabel(name = 'Nuit d’Ambre') {
    const c = labelCanvas.getContext('2d');
    c.clearRect(0, 0, 1024, 640);
    c.fillStyle = 'rgba(12, 9, 7, 0.62)';
    c.fillRect(0, 0, 1024, 640);
    c.strokeStyle = '#e7c98f';
    c.lineWidth = 6;
    c.strokeRect(18, 18, 988, 604);
    c.lineWidth = 2;
    c.strokeRect(40, 40, 944, 560);
    c.fillStyle = '#f2dcaa';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '500 132px "Cormorant Garamond", serif';
    if ('letterSpacing' in c) c.letterSpacing = '22px';
    c.fillText('AURÈLE', 523, 230);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.fillRect(432, 322, 160, 3);
    c.font = 'italic 300 84px "Cormorant Garamond", serif';
    c.fillText(name, 512, 410);
    c.font = '600 26px Manrope, sans-serif';
    if ('letterSpacing' in c) c.letterSpacing = '12px';
    c.fillStyle = '#c9a46a';
    c.fillText('EAU DE PARFUM · 100 ML', 518, 520);
    labelTex.needsUpdate = true;
  }
  drawLabel();

  // --- Orbiting gold rings (opaque, so they refract through the glass) ------
  const ringMat = new THREE.MeshStandardMaterial({ color: '#c9a46a', metalness: 1, roughness: 0.3 });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.009, 12, 240), ringMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.006, 12, 240), ringMat);
  ring1.position.z = ring2.position.z = -0.6;
  root.add(ring1, ring2);

  // --- Gold dust ------------------------------------------------------------
  const N = 700;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  const size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 11;
    pos[i * 3 + 2] = -7 + Math.random() * 8.5;
    seed[i] = Math.random();
    size[i] = 0.4 + Math.random() * 1.6;
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
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.25 + aSeed * 6.2831) * 0.35 + uLift * (0.3 + aSeed * 0.9);
        p.x += cos(uTime * 0.2 + aSeed * 12.0) * 0.3;
        p.y = mod(p.y + 5.5, 11.0) - 5.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR * (28.0 / -mv.z);
        vAlpha = 0.25 + 0.75 * abs(sin(uTime * 0.5 + aSeed * 20.0));
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = pow(smoothstep(0.5, 0.0, d), 2.0);
        gl_FragColor = vec4(uColor, a * vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(pGeo, pMat);
  scene.add(dust);

  // --- State ----------------------------------------------------------------
  const pose = { x: 0.42, y: 0, rotY: 0, rotZ: 0.1, scale: 0.95, opacity: 1 };
  const cur = { ...pose };
  const mouse = { x: 0, y: 0 };
  const mouseL = { x: 0, y: 0 };
  const intro = { v: 0 };
  let halfW = 1, halfH = 1, baseScale = 1, lastOpacity = -1, lift = 0;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    baseScale = camera.aspect < 0.8 ? 0.66 : camera.aspect < 1.2 ? 0.8 : 1;
    pMat.uniforms.uPR.value = renderer.getPixelRatio();
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function update(t, dt) {
    const k = 1 - Math.pow(0.0015, dt);
    for (const key in pose) cur[key] += (pose[key] - cur[key]) * k;
    mouseL.x += (mouse.x - mouseL.x) * k * 0.5;
    mouseL.y += (mouse.y - mouseL.y) * k * 0.5;

    const iv = intro.v;
    root.position.set(cur.x * halfW, cur.y * halfH - (1 - iv) * 0.8, 0);
    root.rotation.set(mouseL.y * 0.1, 0, cur.rotZ);
    root.scale.setScalar(cur.scale * baseScale * (0.35 + 0.65 * iv));

    bottle.position.y = -0.35 + Math.sin(t * 0.8) * 0.06;
    bottle.rotation.y = cur.rotY + Math.sin(t * 0.35) * 0.35 + mouseL.x * 0.5 - (1 - iv) * Math.PI * 1.5;
    bottle.rotation.x = Math.sin(t * 0.6) * 0.04;

    ring1.rotation.set(1.25 + Math.sin(t * 0.3) * 0.15, t * 0.12, 0);
    ring2.rotation.set(1.4 + Math.cos(t * 0.25) * 0.2, -t * 0.08, 0.3);
    ring1.scale.setScalar(0.6 + 0.4 * iv);
    ring2.scale.setScalar(0.5 + 0.5 * iv);

    dust.position.x = -mouseL.x * 0.25;
    pMat.uniforms.uTime.value = t;
    pMat.uniforms.uLift.value = lift;

    const o = Math.max(0, Math.min(1, cur.opacity));
    if (Math.abs(o - lastOpacity) > 0.002) {
      canvas.style.opacity = o.toFixed(3);
      lastOpacity = o;
    }
    if (o > 0.004) renderer.render(scene, camera);
  }

  return {
    pose,
    intro,
    liquidMat,
    update,
    drawLabel,
    setLift(v) { lift = v; },
    color(hex) {
      const c = new THREE.Color(hex);
      return { r: c.r, g: c.g, b: c.b };
    },
  };
}
