import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CameraOff, AlertTriangle } from 'lucide-react';
import { COUNTING_Z, positionAt, type Fixture, type Track } from '../../domain/replay';
import VideoOverlay from './VideoOverlay';

const W = 1200, H = 675;
const project = (point: THREE.Vector3, camera: THREE.Camera) => {
  const p = point.clone().project(camera);
  return { x: (p.x + 1) * W / 2, y: (1 - p.y) * (W / (camera as THREE.PerspectiveCamera).aspect) / 2 };
};

function texture(kind: 'stone' | 'wood') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = kind === 'stone' ? '#bdb4a3' : '#514437'; ctx.fillRect(0, 0, 256, 256);
  let seed = 78219;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = `rgba(${kind === 'stone' ? '77,65,48' : '15,10,7'},${rand() * .12})`;
    ctx.fillRect(rand() * 256, rand() * 256, kind === 'wood' ? 1 : rand() * 3, kind === 'wood' ? 30 + rand() * 120 : rand() * 2);
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(kind === 'stone' ? 8 : 2, kind === 'stone' ? 8 : 2);
  return map;
}

function createWorld(angle: number) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#c3baaa');
  const camera = new THREE.PerspectiveCamera(42, W / H, .1, 100);
  camera.position.set(angle ? -10.5 : 9.4, 13.2, 17.8); camera.lookAt(0, .2, -1.1); camera.zoom = 1.45; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const stoneMap = texture('stone'), woodMap = texture('wood');
  const stone = new THREE.MeshStandardMaterial({ color: 0xddd6c6, roughness: .92, map: stoneMap });
  const plaster = new THREE.MeshStandardMaterial({ color: 0xcec5b4, roughness: .97 });
  const walnut = new THREE.MeshStandardMaterial({ color: 0x8b7562, map: woodMap, roughness: .72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x393a31, roughness: .74 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xaa936b, metalness: .65, roughness: .5 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xe5cda0 });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.castShadow = true; scene.add(mesh); return mesh;
  };
  const cyl = (r: number, h: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), mat); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); return mesh;
  };
  scene.add(new THREE.HemisphereLight(0xf9f1dc, 0x777367, 2.3));
  const sun = new THREE.DirectionalLight(0xfff0d1, 3.1); sun.position.set(-5, 15, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -13; sun.shadow.camera.right = 13; sun.shadow.camera.top = 13; sun.shadow.camera.bottom = -13;
  sun.shadow.normalBias = .035; sun.shadow.bias = -.00015; sun.shadow.radius = 4; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, .65); fill.position.set(7, 6, -2); scene.add(fill);
  // Architectural cutaway: all imagery is original local geometry.
  box(28, .16, 26, 0, -.14, 0, stone);
  box(16.2, 5, .35, 0, 2.5, -8, plaster);
  box(.28, 4.8, 13, -8, 2.4, -1.6, plaster);
  box(.28, 2.8, 13, 8, 1.4, -1.6, plaster);
  box(16, .12, .3, 0, .1, -7.75, dark);
  // Fine floor joints continue outside the threshold.
  const joint = new THREE.MeshStandardMaterial({ color: 0xa8a08e, roughness: 1 });
  for (let i = -14; i <= 14; i += 2) box(.012, .008, 26, i, -.05, 0, joint);
  for (let i = -12; i <= 12; i += 2) box(28, .008, .012, 0, -.05, i, joint);
  // Rear display bays, upright divisions, shelves and carefully arranged vessels.
  for (const x of [-5.7, -2.9, 2.9, 5.7]) {
    box(2.35, 3.25, .15, x, 2.05, -7.73, walnut);
    for (const dx of [-1.18, 1.18]) box(.09, 3.45, .75, x + dx, 2.05, -7.42, walnut);
    for (const y of [.55, 1.35, 2.15, 2.95, 3.75]) {
      box(2.4, .09, .78, x, y, -7.4, walnut);
      box(2.15, .025, .05, x, y - .07, -7.06, glow);
      if (y < 3.7) for (let j = -3; j <= 3; j++) {
        const bottle = new THREE.MeshStandardMaterial({ color: j % 3 === 0 ? 0x9a6730 : j % 2 === 0 ? 0xc9ba93 : 0x5a5140, roughness: .24, metalness: .12 });
        box(.13, .22 + Math.abs(j % 2) * .08, .13, x + j * .27, y + .18, -7.23, bottle);
        box(.085, .055, .085, x + j * .27, y + .32 + Math.abs(j % 2) * .04, -7.23, dark);
      }
    }
  }
  // Brand sign, painted directly on the back wall.
  const signCanvas = document.createElement('canvas'); signCanvas.width = 1024; signCanvas.height = 256;
  const sc = signCanvas.getContext('2d')!; sc.fillStyle = '#393b30'; sc.textAlign = 'center'; sc.font = '58px Georgia';
  sc.fillText('L A V I S H', 512, 115); sc.font = '15px sans-serif'; sc.fillText('P E R F U M E S   ·   D U B A I', 512, 159);
  const signMap = new THREE.CanvasTexture(signCanvas); signMap.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.45), new THREE.MeshBasicMaterial({ map: signMap, transparent: true, depthWrite: false }));
  sign.position.set(0, 4.18, -7.78); scene.add(sign);
  // Consultation island leaves the entrance and primary walking lanes open.
  box(3.8, .85, 1.5, 0, .43, -3.3, walnut);
  box(4.1, .16, 1.75, 0, .92, -3.3, stone);
  box(3.7, .06, 1.45, 0, .06, -3.3, dark);
  for (let i = -3; i <= 3; i++) {
    box(.2, .22, .17, i * .45, 1.11, -3.4, brass);
    box(.1, .065, .1, i * .45, 1.25, -3.4, dark);
  }
  // Side consoles and repeated walnut ribs.
  for (const x of [-7, 7]) {
    box(1.1, .9, 5.2, x, .45, -3.5, walnut); box(1.2, .12, 5.4, x, .96, -3.5, stone);
    for (let j = 0; j < 6; j++) {
      cyl(.13, .3, x, 1.16, -5.5 + j * .75, brass);
      box(.19, .05, .19, x, 1.34, -5.5 + j * .75, dark);
    }
  }
  // Display plinth, doorway jambs and flush entrance threshold.
  cyl(.68, .85, -5.1, .43, -.2, stone); cyl(.71, .06, -5.1, .88, -.2, brass);
  cyl(.13, .42, -5.1, 1.12, -.2, dark);
  box(.34, 4.3, .34, -6.9, 2.15, 3.6, walnut); box(.34, 4.3, .34, 6.9, 2.15, 3.6, walnut);
  box(14, .035, .14, 0, -.015, 3.7, brass);
  // Discreet store mat, no invented photographic source.
  box(4.8, .014, 1.6, 0, -.02, 5.1, new THREE.MeshStandardMaterial({ color: 0x777567, roughness: 1 }));
  const people = new Map<string, THREE.Group>();
  const dispose = () => {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), maps = new Set<THREE.Texture>([stoneMap, woodMap, signMap]);
    scene.traverse(o => { if (o instanceof THREE.Mesh) { geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m); } });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); maps.forEach(m => m.dispose());
  };
  return { scene, camera, people, dispose };
}

function makePerson(track: Track) {
  const group = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: track.color, roughness: .94 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb08c72, roughness: .95 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x2c2e29, roughness: .9 });
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, name?: string) => {
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; if (name) mesh.name = name; group.add(mesh); return mesh;
  };
  part(new THREE.SphereGeometry(.155, 16, 12), skin, 0, 1.64, 0);
  const hair = part(new THREE.SphereGeometry(.158, 16, 12, 0, Math.PI * 2, 0, Math.PI * .6), shoe, 0, 1.68, 0); hair.rotation.x = -.15;
  const torso = part(new THREE.CapsuleGeometry(.22, .37, 5, 12), cloth, 0, 1.14, 0); torso.scale.z = .68;
  part(new THREE.CapsuleGeometry(.085, .5, 4, 8), cloth, -.28, 1.08, 0, 'armL');
  part(new THREE.CapsuleGeometry(.085, .5, 4, 8), cloth, .28, 1.08, 0, 'armR');
  for (const x of [-.115, .115]) {
    part(new THREE.CapsuleGeometry(.09, .58, 4, 10), cloth, x, .42, 0, x < 0 ? 'legL' : 'legR');
    part(new THREE.BoxGeometry(.16, .11, .3), shoe, x, .075, -.06);
  }
  if (parseInt(track.id.slice(2)) % 3 === 0) part(new THREE.BoxGeometry(.28, .34, .13), new THREE.MeshStandardMaterial({ color: 0x9c8259, roughness: .8 }), .4, .75, -.04);
  return group;
}

export default function CameraScene({ fixture, atMs, overlay, trajectories }: { fixture: Fixture; atMs: number; overlay: boolean; trajectories: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [failed, setFailed] = useState(false);
  const [, setAspect] = useState(W / H);
  const world = useMemo(() => createWorld(fixture.camera.angle), [fixture.camera.angle]);
  const active = fixture.tracks.filter(t => t.start <= atMs && t.end > atMs);

  useEffect(() => {
    if (!host.current || fixture.camera.status === 'offline') return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
      host.current.appendChild(renderer.domElement); rendererRef.current = renderer; setFailed(false);
    } catch { setFailed(true); return; }
    const resize = new ResizeObserver(([entry]) => {
      const aspect = entry.contentRect.width / entry.contentRect.height;
      world.camera.aspect = aspect; world.camera.updateProjectionMatrix();
      renderer.setSize(entry.contentRect.width, entry.contentRect.height, false); renderer.render(world.scene, world.camera); setAspect(aspect);
    }); resize.observe(host.current);
    const onLost = (event: Event) => { event.preventDefault(); setFailed(true); };
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    return () => { resize.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', onLost); renderer.dispose(); renderer.domElement.remove(); rendererRef.current = null; };
  }, [world, fixture.camera.status]);

  useEffect(() => {
    world.people.forEach(p => { p.visible = false; });
    for (const track of active) {
      const key = `${fixture.scenario}:${track.id}`;
      let person = world.people.get(key);
      if (!person) { person = makePerson(track); world.people.set(key, person); world.scene.add(person); }
      const pos = positionAt(track, atMs), next = positionAt(track, atMs + 30); person.visible = true; person.position.set(pos.x, 0, pos.z); person.rotation.y = Math.atan2(-(next.x - pos.x), -(next.z - pos.z));
      const stride = Math.sin((atMs - track.start) / 240) * .22;
      person.getObjectByName('legL')!.rotation.x = stride; person.getObjectByName('legR')!.rotation.x = -stride;
      person.getObjectByName('armL')!.rotation.x = -stride; person.getObjectByName('armR')!.rotation.x = stride;
    }
    rendererRef.current?.render(world.scene, world.camera);
  }, [atMs, fixture, world, active]);

  // Dispose is deferred until unmount to avoid StrictMode's effect replay invalidating live resources.
  useEffect(() => () => world.dispose(), [world]);
  const a = project(new THREE.Vector3(-6.6, .03, COUNTING_Z), world.camera);
  const b = project(new THREE.Vector3(6.6, .03, COUNTING_Z), world.camera);
  // LV04: the geometry below is unchanged; it is only collected for the presentation overlay so the
  // labels can be rendered at real CSS-pixel sizes instead of being scaled down with the viewBox.
  const overlayTracks = active.map(track => {
    const pos = positionAt(track, atMs);
    const foot = project(new THREE.Vector3(pos.x, 0, pos.z), world.camera);
    const points = [new THREE.Vector3(pos.x - .42, 0, pos.z - .3), new THREE.Vector3(pos.x + .42, 0, pos.z + .3), new THREE.Vector3(pos.x - .42, 1.9, pos.z - .3), new THREE.Vector3(pos.x + .42, 1.9, pos.z + .3)].map(p => project(p, world.camera));
    const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
    const w = Math.max(...points.map(p => p.x)) - x, h = Math.max(...points.map(p => p.y)) - y;
    const history = Array.from({ length: 16 }, (_, i) => {
      const p = positionAt(track, Math.max(track.start, atMs - (15 - i) * 200));
      const v = project(new THREE.Vector3(p.x, .04, p.z), world.camera); return `${v.x},${v.y}`;
    }).join(' ');
    return { id: track.id, confidence: track.confidence, direction: track.direction, box: { x, y, w, h }, foot, history };
  });
  if (fixture.camera.status === 'offline') return <div className="scene-unavailable"><CameraOff size={34} strokeWidth={1} /><h3>Camera unavailable</h3><p>This simulated device is offline.<br />No events or counts are generated.</p><span>CAM-MOE-01 · Select an available camera to continue</span></div>;
  return <div className="scene" data-testid="camera-scene">
    <div ref={host} className="scene-render" />
    {failed ? <div className="scene-unavailable"><AlertTriangle size={30} /><h3>Scene rendering unavailable</h3><p>Enable WebGL and reload to view the synthetic camera.<br />Event replay remains available for inspection.</p></div> : <VideoOverlay viewBoxW={W} viewBoxH={W / world.camera.aspect} overlay={overlay} trajectories={trajectories} countingLine={{ a, b }} tracks={overlayTracks} />}
    <div className="scene-vignette" />
  </div>;
}
