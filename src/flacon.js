import * as THREE from 'three';

// The Aurèle flacon: a ten-panel cut-crystal amphora with a thick base, gold
// collar, faceted amber stopper and an engraved gold medallion.
// Panels are flat around the circumference but curve smoothly from base to
// shoulder (custom normals), which is what real moulded crystal does.
// Group origin sits at the bottle's visual centre.

export const FACETS = 10;
const OUTER = [[0.5, -1.2], [0.58, -1.17], [0.63, -1.07], [0.67, -0.72], [0.79, -0.15], [0.885, 0.3], [0.9, 0.5], [0.845, 0.76], [0.66, 0.98], [0.42, 1.12], [0.26, 1.18], [0.205, 1.22], [0.2, 1.34]];
const INNER = [[0.44, -0.9], [0.53, -0.7], [0.67, -0.15], [0.77, 0.3], [0.79, 0.5], [0.73, 0.74], [0.57, 0.93], [0.3, 1.06]];
const GEM = [[0, 0], [0.2, 0.0], [0.34, 0.1], [0.42, 0.3], [0.43, 0.46], [0.36, 0.7], [0.22, 0.88], [0.11, 0.96], [0, 0.96]];
const LEVEL_MIN = -0.9, LEVEL_MAX = 0.66;
export const FULL = 0.8;
export const NECK_Y = 0.84; // top of the neck in group space

// Smooth a sparse profile into many points (centripetal Catmull-Rom)
function sampleProfile(ctrl, n) {
  const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  return { pts: curve.getSpacedPoints(n), tan: Array.from({ length: n + 1 }, (_, i) => curve.getTangentAt(i / n)) };
}

// Polygonal surface of revolution: flat panels around, smooth normals along the profile.
function facetedGeometry(ctrl, facets, samples, { capBottom = true, capTop = true } = {}) {
  const { pts, tan } = sampleProfile(ctrl, samples);
  const k = Math.cos(Math.PI / facets);
  const off = -Math.PI / facets; // centre a panel on +z
  const pos = [], nor = [];
  const P = (a, p) => [Math.sin(a) * p.x, p.y, Math.cos(a) * p.x];
  const N = (ac, t) => {
    const nx = t.y, ny = -t.x * k, l = Math.hypot(nx, ny) || 1;
    return [(Math.sin(ac) * nx) / l, ny / l, (Math.cos(ac) * nx) / l];
  };
  const tri = (a, b, c, na, nb, nc) => { pos.push(...a, ...b, ...c); nor.push(...na, ...nb, ...nc); };
  for (let f = 0; f < facets; f++) {
    const a0 = (f / facets) * Math.PI * 2 + off, a1 = ((f + 1) / facets) * Math.PI * 2 + off, ac = (a0 + a1) / 2;
    for (let i = 0; i < samples; i++) {
      const p = pts[i], q = pts[i + 1];
      const A = P(a0, p), B = P(a1, p), C = P(a1, q), D = P(a0, q);
      const np = N(ac, tan[i]), nq = N(ac, tan[i + 1]);
      tri(A, B, C, np, np, nq);
      tri(A, C, D, np, nq, nq);
    }
    const down = [0, -1, 0], up = [0, 1, 0];
    if (capBottom) { const p = pts[0]; tri([0, p.y, 0], P(a1, p), P(a0, p), down, down, down); }
    if (capTop) { const q = pts[samples]; tri([0, q.y, 0], P(a0, q), P(a1, q), up, up, up); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

function radiusAt(profile, y) {
  for (let i = 1; i < profile.length; i++) {
    const [x0, y0] = profile[i - 1], [x1, y1] = profile[i];
    if (y >= Math.min(y0, y1) && y <= Math.max(y0, y1) && y1 !== y0) return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
  }
  return 0;
}
// Liquid cavity: smooth, round, closed solid
const innerProfile = [[0, INNER[0][1]], ...sampleProfile(INNER, 60).pts.map((p) => [p.x, p.y]), [0, INNER[INNER.length - 1][1]]];
const outerProfile = sampleProfile(OUTER, 60).pts.map((p) => [p.x, p.y]);

// Translucent perfume: glowing core, deeper colour at the rim (longer light path).
function liquidMaterial(color, plane) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uMinY: { value: LEVEL_MIN },
      uLevelY: { value: LEVEL_MAX },
    },
    clipping: true,
    clippingPlanes: [plane],
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      #include <clipping_planes_pars_vertex>
      varying vec3 vN; varying vec3 vView; varying float vY;
      void main() {
        vY = position.y;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <clipping_planes_pars_fragment>
      uniform vec3 uColor; uniform float uMinY; uniform float uLevelY;
      varying vec3 vN; varying vec3 vView; varying float vY;
      void main() {
        #include <clipping_planes_fragment>
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        float facing = clamp(abs(dot(n, normalize(vView))), 0.0, 1.0);
        vec3 deep = pow(uColor, vec3(2.2)) * 0.45;          // saturated, darker (longer light path)
        vec3 core = uColor * 0.98;                           // backlit glow
        vec3 col = mix(deep, core, pow(facing, 1.35));
        float h = clamp((vY - uMinY) / max(0.001, uLevelY - uMinY), 0.0, 1.0);
        col *= mix(0.78, 1.08, smoothstep(0.0, 0.85, h));    // light pools toward the surface
        col = mix(col, deep * 0.5, pow(1.0 - facing, 4.0) * 0.9);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  // Mirror a standard material's API so existing colour tweens keep working
  mat.color = mat.uniforms.uColor.value;
  mat.emissive = new THREE.Color();
  return mat;
}

let medallion = null;
function drawMedallion(g) {
  const grd = g.createRadialGradient(200, 180, 20, 256, 256, 260);
  grd.addColorStop(0, '#fff1c9');
  grd.addColorStop(0.5, '#d8b06a');
  grd.addColorStop(1, '#8a6330');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(70,45,15,.85)';
  g.lineWidth = 6;
  g.beginPath(); g.arc(256, 256, 236, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2;
  g.beginPath(); g.arc(256, 256, 176, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(60,38,12,.9)';
  g.font = '600 34px "Cormorant Garamond", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const ring = 'AURÈLE · MAISON DE PARFUM · PARIS · ';
  for (let i = 0; i < ring.length; i++) {
    const a = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
    g.save();
    g.translate(256 + Math.cos(a) * 206, 256 + Math.sin(a) * 206);
    g.rotate(a + Math.PI / 2);
    g.fillText(ring[i], 0, 0);
    g.restore();
  }
  g.font = 'italic 300 250px "Cormorant Garamond", serif';
  g.fillText('A', 256, 272);
}
function medallionTexture() {
  if (medallion) return medallion.tex;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  drawMedallion(canvas.getContext('2d'));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  medallion = { canvas, tex };
  return tex;
}
// Call once web fonts have loaded so the engraving uses Cormorant.
export function redrawMedallion() {
  if (!medallion) return;
  drawMedallion(medallion.canvas.getContext('2d'));
  medallion.tex.needsUpdate = true;
}

export function createFlacon({ color = '#d9861a', level = FULL } = {}) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = -0.5;
  group.add(body);

  // Cut-crystal glass: very faint green tint in thick sections, like real soda-lime glass
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.0, metalness: 0, transmission: 1, thickness: 1.3, ior: 1.5, dispersion: 1.6,
    specularIntensity: 1, envMapIntensity: 1.15,
    attenuationColor: new THREE.Color('#e9f1ea'), attenuationDistance: 3.2,
  });
  const glass = new THREE.Mesh(facetedGeometry(OUTER, FACETS, 90), glassMat);
  body.add(glass);

  // Liquid: a clipped solid + surface disc + bright meniscus line
  const localPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const worldPlane = new THREE.Plane();
  const liquidMat = liquidMaterial(color, worldPlane);
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(innerProfile.map(([x, y]) => new THREE.Vector2(x, y)), 96), liquidMat);
  const surface = new THREE.Mesh(new THREE.CircleGeometry(1, 96), liquidMat);
  surface.rotation.x = -Math.PI / 2;
  const meniscusMat = new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0.55, depthWrite: false });
  const meniscus = new THREE.Mesh(new THREE.TorusGeometry(1, 0.008, 8, 128), meniscusMat);
  meniscus.rotation.x = Math.PI / 2;
  body.add(liquid, surface, meniscus);

  // Gold collar
  const gold = new THREE.MeshStandardMaterial({ color: '#d9b36d', metalness: 1, roughness: 0.16, envMapIntensity: 1.3 });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.265, 0.16, 96), gold);
  collar.position.y = 1.28;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.016, 16, 96), gold);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 1.36;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.258, 0.01, 12, 96), gold);
  band.rotation.x = Math.PI / 2;
  band.position.y = 1.205;
  body.add(collar, lip, band);

  // Faceted amber stopper with a polished flat table on top
  const stopper = new THREE.Group();
  stopper.position.y = 1.37;
  const gemMat = new THREE.MeshPhysicalMaterial({
    color: '#fff6e8', roughness: 0.0, transmission: 1, thickness: 0.6, ior: 1.6, dispersion: 5, flatShading: true,
    attenuationColor: new THREE.Color('#e8a24a'), attenuationDistance: 1.8, envMapIntensity: 1.6, specularIntensity: 1,
    emissive: new THREE.Color('#5a2e08'), emissiveIntensity: 0.35,
  });
  const gem = new THREE.Mesh(new THREE.LatheGeometry(GEM.map(([x, y]) => new THREE.Vector2(x, y)), 12), gemMat);
  gem.rotation.y = Math.PI / 12;
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 64), gold);
  stopper.add(seat, gem);
  body.add(stopper);

  // Engraved medallion on the front panel
  const my = 0.22;
  const slope = (radiusAt(outerProfile, my + 0.05) - radiusAt(outerProfile, my - 0.05)) / 0.1;
  const faceR = radiusAt(outerProfile, my) * Math.cos(Math.PI / FACETS);
  const medal = new THREE.Group();
  medal.position.set(0, my, 0);
  medal.rotation.x = Math.atan(slope);
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.016, 96),
    // transparent (opacity 1) keeps it out of the glass's screen-space refraction, so it isn't duplicated
    [gold.clone(), new THREE.MeshStandardMaterial({ map: medallionTexture(), emissiveMap: medallionTexture(), emissive: '#5a4428', metalness: 0.6, roughness: 0.3 }), gold.clone()]
      .map((m) => Object.assign(m, { transparent: true })),
  );
  disc.rotation.x = Math.PI / 2;
  disc.rotation.y = Math.PI;
  disc.position.z = faceR + 0.011;
  medal.add(disc);
  body.add(medal);

  let lvl = level, lift = 0;
  const white = new THREE.Color(1, 1, 1);
  function update() {
    const y = LEVEL_MIN + (LEVEL_MAX - LEVEL_MIN) * THREE.MathUtils.clamp(lvl, 0, 1);
    liquid.visible = surface.visible = meniscus.visible = lvl > 0.004;
    localPlane.constant = y;
    body.updateMatrixWorld(true);
    worldPlane.copy(localPlane).applyMatrix4(body.matrixWorld);
    liquidMat.uniforms.uLevelY.value = y;
    const r = radiusAt(innerProfile, y) * 0.995;
    surface.position.y = y - 0.002;
    surface.scale.set(r, r, 1);
    meniscus.position.y = y;
    meniscus.scale.set(r, r, 1);
    meniscusMat.color.copy(liquidMat.color).lerp(white, 0.6);
    stopper.position.y = 1.37 + lift;
    stopper.rotation.y = lift * 2.2;
  }

  return {
    group, glassMat, liquidMat, gemMat,
    setColor(hex) { liquidMat.color.set(hex); },
    setLevel(v) { lvl = v; },
    getLevel: () => lvl,
    setLift(v) { lift = v; },
    update,
  };
}
