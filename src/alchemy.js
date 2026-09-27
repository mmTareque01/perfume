import * as THREE from 'three';
import { NECK_Y } from './flacon.js';

// Procedural flowers whose petals spiral into the flacon.
const smooth = THREE.MathUtils.smoothstep;
const clamp = THREE.MathUtils.clamp;

function petalGeometry({ len, width, cup = 0, curl = 0, base, tip, segX = 6, segY = 10 }) {
  const g = new THREE.PlaneGeometry(1, 1, segX, segY);
  const pos = g.attributes.position;
  const cb = new THREE.Color(base), ct = new THREE.Color(tip), c = new THREE.Color();
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), t = pos.getY(i) + 0.5;
    const w = Math.pow(Math.sin(Math.PI * (t * 0.94 + 0.03)), 0.65) * (0.3 + 0.7 * Math.sqrt(t));
    pos.setXYZ(i, x * width * w, t * len, cup * (2 * x) ** 2 * (0.3 + 0.7 * t) + curl * t * t);
    c.lerpColors(cb, ct, Math.pow(t, 0.75));
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

const petalMat = (sheen = '#ffffff') => new THREE.MeshPhysicalMaterial({
  vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(sheen),
});
const greenMat = new THREE.MeshStandardMaterial({ color: '#3f5a2c', roughness: 0.6, side: THREE.DoubleSide });

function ringOfPetals(parent, { n, geo, mat, tilt, radius, offset = 0, jitter = 0.08 }) {
  for (let i = 0; i < n; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / n) * Math.PI * 2 + offset;
    const m = new THREE.Mesh(geo, mat);
    m.position.z = radius;
    m.rotation.x = tilt + (Math.random() - 0.5) * jitter;
    m.rotation.z = (Math.random() - 0.5) * jitter;
    pivot.add(m);
    parent.add(pivot);
  }
}

function stem(parent, len, bend = 0.12) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(bend, -len * 0.5, 0.04), new THREE.Vector3(bend * 0.4, -len, 0.08)]);
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.018, 8), greenMat));
  return curve;
}
function leaf(parent, at, rotY, rotX, scale = 1) {
  const m = new THREE.Mesh(petalGeometry({ len: 0.36 * scale, width: 0.18 * scale, cup: -0.03, curl: 0.05, base: '#2f4a20', tip: '#5d7d3a' }), greenMat.clone());
  m.material.vertexColors = true;
  m.material.color.set('#ffffff');
  const pv = new THREE.Group();
  pv.position.copy(at);
  pv.rotation.y = rotY;
  m.rotation.x = rotX;
  pv.add(m);
  parent.add(pv);
}

function makeRose() {
  const f = new THREE.Group();
  const head = new THREE.Group();
  const mat = petalMat('#ffb8c8');
  [
    [3, 0.2, 0.18, 0.08, -0.08, 0, 0.01],
    [4, 0.25, 0.24, 0.24, -0.08, 0.01, 0.025],
    [5, 0.29, 0.28, 0.46, -0.07, 0.03, 0.04],
    [6, 0.33, 0.33, 0.76, -0.05, 0.05, 0.05],
    [7, 0.35, 0.35, 1.06, -0.03, 0.08, 0.06],
    [8, 0.35, 0.36, 1.32, -0.01, 0.1, 0.065],
  ].forEach(([n, len, width, tilt, cup, curl, radius], k) => {
    const geo = petalGeometry({ len, width, cup, curl, base: '#5c0a1f', tip: k < 2 ? '#b8284c' : '#dd4a6c' });
    ringOfPetals(head, { n, geo, mat, tilt, radius, offset: k * 0.7 });
  });
  const sepals = petalGeometry({ len: 0.2, width: 0.07, curl: 0.04, base: '#2f4a20', tip: '#4c6b2e' });
  ringOfPetals(head, { n: 5, geo: sepals, mat: petalMat('#8fbf6a'), tilt: 2.3, radius: 0.04 });
  f.add(head);
  stem(f, 1.3);
  leaf(f, new THREE.Vector3(0.1, -0.55, 0.05), 0.4, 1.1);
  leaf(f, new THREE.Vector3(0.08, -0.8, 0.06), 3.2, 1.2, 0.8);
  return { group: f, head, palette: ['#b8284c', '#dd4a6c', '#8e1634', '#e8708c'] };
}

function makeJasmine() {
  const f = new THREE.Group();
  const head = new THREE.Group();
  const mat = petalMat('#ffffff');
  ringOfPetals(head, { n: 5, geo: petalGeometry({ len: 0.26, width: 0.13, cup: 0.015, curl: -0.05, base: '#efe3bd', tip: '#ffffff' }), mat, tilt: 1.42, radius: 0.03 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.22, 12), new THREE.MeshStandardMaterial({ color: '#efe2c0', roughness: 0.5 }));
  tube.position.y = -0.11;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: '#e7c35a', roughness: 0.4 }));
  eye.position.y = 0.02;
  head.add(tube, eye);
  // two buds
  const budMat = new THREE.MeshPhysicalMaterial({ color: '#f6d6dc', roughness: 0.5, sheen: 1 });
  [[0.24, -0.1, 0.02, 0.5], [-0.2, -0.16, -0.04, -0.6]].forEach(([x, y, z, r]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), budMat);
    b.scale.set(1, 2.2, 1);
    b.position.set(x, y, z);
    b.rotation.z = r;
    f.add(b);
  });
  f.add(head);
  stem(f, 1.1, -0.1);
  leaf(f, new THREE.Vector3(-0.06, -0.5, 0.04), -0.8, 1.2, 0.9);
  return { group: f, head, palette: ['#ffffff', '#f7efd8', '#fbe9ee'] };
}

function makeOrangeBlossom() {
  const f = new THREE.Group();
  const head = new THREE.Group();
  ringOfPetals(head, { n: 5, geo: petalGeometry({ len: 0.3, width: 0.17, cup: 0.04, curl: 0.09, base: '#f4ecd2', tip: '#fffdf5' }), mat: petalMat('#fff6e0'), tilt: 1.15, radius: 0.04 });
  const filMat = new THREE.MeshStandardMaterial({ color: '#f1e7b8', roughness: 0.5 });
  const antherMat = new THREE.MeshStandardMaterial({ color: '#e0a526', roughness: 0.4 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const pv = new THREE.Group();
    pv.rotation.y = a;
    const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), filMat);
    fil.position.set(0, 0.08, 0.03);
    fil.rotation.x = 0.35;
    const an = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), antherMat);
    an.position.set(0, 0.155, 0.058);
    pv.add(fil, an);
    head.add(pv);
  }
  const pistil = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.2, 10), new THREE.MeshStandardMaterial({ color: '#9fbf4a', roughness: 0.4 }));
  pistil.position.y = 0.1;
  head.add(pistil);
  f.add(head);
  stem(f, 1.0, 0.08);
  leaf(f, new THREE.Vector3(0.06, -0.4, 0.04), 0.9, 1.15);
  return { group: f, head, palette: ['#fffdf5', '#f4ecd2', '#f7d98a'] };
}

function makeLavender() {
  const f = new THREE.Group();
  const head = new THREE.Group();
  const budGeo = new THREE.SphereGeometry(0.03, 10, 8);
  const budMat = new THREE.MeshPhysicalMaterial({ roughness: 0.6, sheen: 1, sheenColor: new THREE.Color('#d8c8ff') });
  const stalks = [[0, 0, 0, 0], [0.16, -0.12, 0.05, 0.14], [-0.15, -0.08, -0.04, -0.12]];
  const count = stalks.length * 11 * 6;
  const buds = new THREE.InstancedMesh(budGeo, budMat, count);
  const d = new THREE.Object3D(), c = new THREE.Color();
  let n = 0;
  stalks.forEach(([sx, sy, sz, lean]) => {
    const s = new THREE.Group();
    s.position.set(sx, sy, sz);
    s.rotation.z = lean;
    f.add(s);
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 1.5, 6), new THREE.MeshStandardMaterial({ color: '#6f7f5a', roughness: 0.7 })).translateY(-0.45));
    for (let w = 0; w < 11; w++) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + w * 0.5;
        const r = 0.035 * (1 - w / 16);
        d.position.set(sx + Math.cos(a) * r + Math.sin(lean) * -(w * 0.045), sy + 0.3 - w * 0.045, sz + Math.sin(a) * r);
        d.scale.set(1, 1.5, 1).multiplyScalar(1 - w / 22);
        d.rotation.set(Math.random(), a, 0);
        d.updateMatrix();
        buds.setMatrixAt(n, d.matrix);
        buds.setColorAt(n++, c.set(['#7b5cc4', '#9677d8', '#6a4fb0', '#b39cf0'][(w + k) % 4]));
      }
    }
  });
  head.add(buds);
  f.add(head);
  return { group: f, head, palette: ['#7b5cc4', '#9677d8', '#b39cf0'] };
}

export function createAlchemy() {
  const group = new THREE.Group();
  const flowers = [makeRose(), makeJasmine(), makeOrangeBlossom(), makeLavender()];
  const layouts = {
    desktop: [[-2.25, 0.95, 0.3, 0.55, 0.25], [2.3, 1.05, 0, 0.5, -0.3], [-2.1, -0.95, 0.4, 0.4, 0.15], [2.2, -0.75, 0, 0.1, -0.1]],
    mobile: [[-1.25, 2.3, 0.3, 0.55, 0.25], [1.3, 2.2, 0, 0.5, -0.3], [-1.25, -2.3, 0.4, 0.4, 0.15], [1.3, -2.1, 0, 0.1, -0.1]],
  };
  flowers.forEach((fl, i) => {
    fl.anchor = new THREE.Object3D();
    fl.head.add(fl.anchor);
    fl.group.userData.i = i;
    group.add(fl.group);
  });

  // Petal vortex
  const N = 420;
  const petals = new THREE.InstancedMesh(
    petalGeometry({ len: 0.16, width: 0.12, cup: 0.03, curl: 0.03, base: '#ffffff', tip: '#ffffff', segX: 3, segY: 5 }),
    new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, roughness: 0.5, sheen: 1, sheenRoughness: 0.5 }),
    N,
  );
  petals.frustumCulled = false;
  const data = Array.from({ length: N }, (_, i) => {
    const src = i % 4;
    return {
      src,
      jitter: new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4),
      delay: Math.random() * 0.4,
      a0: Math.random() * Math.PI * 2,
      rx: Math.random() * 6, ry: Math.random() * 6,
      size: 0.6 + Math.random() * 0.7,
    };
  });
  const col = new THREE.Color();
  data.forEach((p, i) => petals.setColorAt(i, col.set(flowers[p.src].palette[i % flowers[p.src].palette.length])));
  group.add(petals);

  // Glow at the neck where the essence pours in
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,220,160,1)');
    r.addColorStop(1, 'rgba(255,220,160,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.position.set(0, NECK_Y + 0.1, 0);
  group.add(glow);

  const d = new THREE.Object3D();
  const S = new THREE.Vector3(), E = new THREE.Vector3(0, NECK_Y + 0.15, 0), P = new THREE.Vector3();
  const starts = flowers.map(() => new THREE.Vector3());

  // A: 0..1 across the whole pinned section
  function update(A, t, mobile) {
    if (A <= 0) { group.visible = false; return; }
    const layout = mobile ? layouts.mobile : layouts.desktop;
    const bloom = smooth(A, 0.0, 0.16);
    const swirl = clamp((A - 0.28) / 0.47, 0, 1);
    flowers.forEach((fl, i) => {
      const [x, y, z, rx, rz] = layout[i];
      const shed = smooth(swirl, 0.1 + i * 0.06, 0.75 + i * 0.04);
      const b = bloom - 1;
      const s = (1 + 2.70158 * b ** 3 + 1.70158 * b ** 2) * (1 - shed); // back-out bloom, then shrink as petals leave
      fl.group.position.set(x, y + Math.sin(t * 0.8 + i) * 0.05, z);
      fl.group.rotation.set(rx, t * 0.12 + i, rz + Math.sin(t * 0.6 + i) * 0.05);
      fl.group.scale.setScalar(Math.max(0.0001, s * 1.25));
      fl.head.rotation.y = -t * 0.12 - i;
      fl.group.visible = s > 0.002;
      fl.group.updateMatrixWorld(true);
      starts[i].setFromMatrixPosition(fl.head.matrixWorld);
      group.worldToLocal(starts[i]);
    });

    let absorbing = 0;
    for (let i = 0; i < N; i++) {
      const p = data[i];
      const u = clamp((swirl - p.delay) / 0.6, 0, 1);
      if (u <= 0 || u >= 1) {
        d.scale.setScalar(0);
      } else {
        const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
        S.copy(starts[p.src]).add(p.jitter);
        P.copy(S).lerp(E, e);
        const r = (1 - e) * (0.25 + 0.9 * Math.sin(Math.PI * Math.min(1, e * 1.15)));
        const th = p.a0 + u * 9;
        P.x += Math.cos(th) * r;
        P.z += Math.sin(th) * r;
        P.y += Math.sin(th * 0.7) * 0.25 * (1 - e);
        d.position.copy(P);
        d.rotation.set(u * 8 + p.rx, u * 6 + p.ry, u * 3);
        d.scale.setScalar(smooth(u, 0, 0.08) * (1 - smooth(u, 0.82, 1)) * p.size);
        if (u > 0.8) absorbing++;
      }
      d.updateMatrix();
      petals.setMatrixAt(i, d.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
    petals.visible = swirl > 0 && swirl < 1;
    const g = Math.min(1, absorbing / 30) * 0.9 + smooth(A, 0.7, 0.8) * (1 - smooth(A, 0.86, 0.95)) * 0.6;
    glow.material.opacity = g;
    glow.scale.setScalar(0.9 + g * 0.8);
    group.visible = A > 0 && A < 0.999;
  }

  return { group, flowers, update };
}
