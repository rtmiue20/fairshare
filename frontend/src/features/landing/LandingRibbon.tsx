import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GL_M = 66;
const GL_L = 23;
const PW = 3.5;
const PH = 0.98;

const VERT = `
attribute float aT;
varying vec3 vN; varying vec3 vV; varying vec3 vLN; varying float vT;
void main(){
  vec4 mv=modelViewMatrix*instanceMatrix*vec4(position,1.0);
  vN=normalize(normalMatrix*mat3(instanceMatrix)*normal);
  vLN=normal; vV=-mv.xyz; vT=aT;
  gl_Position=projectionMatrix*mv;
}`;

const FRAG = `
uniform vec3 fA; uniform vec3 fB; uniform vec3 fC; uniform vec3 rA; uniform vec3 rB;
uniform vec3 eLo; uniform vec3 eHi; uniform float uOp; uniform float uDeep;
varying vec3 vN; varying vec3 vV; varying vec3 vLN; varying float vT;
void main(){
  vec3 n=normalize(vN); vec3 v=normalize(vV);
  float face=abs(normalize(vLN).z);
  float rimW=1.-smoothstep(.6,.97,face);
  vec3 fc=vT<.5?mix(fA,fB,vT*2.):mix(fB,fC,(vT-.5)*2.);
  vec3 rc=mix(rA,rB,smoothstep(.15,.95,vT));
  vec3 L=normalize(vec3(-.4,.8,.6));
  float diff=dot(n,L)*.5+.5;
  fc*=uDeep+(1.-uDeep)*(.62+.46*diff);
  rc*=.86+.22*diff;
  vec3 col=mix(fc,rc,rimW);
  vec3 r=reflect(-v,n);
  vec3 env=mix(eLo,eHi,r.y*.5+.5);
  float fres=pow(1.-clamp(dot(n,v),0.,1.),3.);
  col=mix(col,env,fres*.35);
  vec3 hv=normalize(L+v); float nh=max(dot(n,hv),0.);
  col+=vec3(pow(nh,110.)*1.1+pow(nh,14.)*.09);
  vec3 L2=normalize(vec3(.6,.3,.75));
  col+=vec3(rimW*pow(max(dot(n,normalize(L2+v)),0.),26.)*.55);
  gl_FragColor=vec4(col,uOp);
}`;

function plateGeo() {
  const w = PW / 2;
  const h = PH / 2;
  const c = 0.42;
  const sh = new THREE.Shape();
  sh.moveTo(-w + c, -h);
  sh.lineTo(w - c, -h);
  sh.lineTo(w, -h + c);
  sh.lineTo(w, h - c);
  sh.lineTo(w - c, h);
  sh.lineTo(-w + c, h);
  sh.lineTo(-w, h - c);
  sh.lineTo(-w, -h + c);
  sh.closePath();

  const g = new THREE.ExtrudeGeometry(sh, {
    depth: 0.17,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelOffset: -0.1,
    bevelSegments: 6,
    curveSegments: 2,
  });
  g.translate(0, 0, -0.085);
  return g;
}

const KF = [
  { x: 0.7, y: 0.5, a: -64, len: 1.9, amp: 0.2, w: 0.17, tw: 2.4, al: 1 },
  { x: 0.12, y: 0.6, a: -70, len: 1.9, amp: 0.18, w: 0.15, tw: 2.6, al: 0.5 },
  { x: 0.88, y: 0.3, a: -40, len: 1.8, amp: 0.16, w: 0.14, tw: 2.4, al: 0.5 },
  { x: 0.5, y: 0.74, a: -18, len: 1.9, amp: 0.14, w: 0.13, tw: 2.8, al: 0.38 },
  { x: 0.5, y: 0.92, a: -6, len: 1.9, amp: 0.12, w: 0.12, tw: 2.6, al: 0.4 },
  { x: 0.9, y: 0.55, a: -58, len: 1.9, amp: 0.17, w: 0.15, tw: 2.4, al: 0.5 },
];

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a: number, b: number, x: number) => {
  const norm = clamp((x - a) / (b - a));
  return norm * norm * (3 - 2 * norm);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

interface LandingRibbonProps {
  scrollProgress: number; // 0 to 1
}

export const LandingRibbon: React.FC<LandingRibbonProps> = ({ scrollProgress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const canvas3dRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const cv2d = canvas2dRef.current;
    const cv3d = canvas3dRef.current;
    if (!container || !cv2d || !cv3d) return;

    const ctx2d = cv2d.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    let animId = 0;
    let s = scrollProgress;

    // Three.js setup
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let mesh: THREE.InstancedMesh | null = null;
    let mat: THREE.ShaderMaterial | null = null;
    let group: THREE.Group | null = null;

    const m = new THREE.Matrix4();
    const T = new THREE.Vector3();
    const B0 = new THREE.Vector3();
    const N0 = new THREE.Vector3();
    const B = new THREE.Vector3();
    const N = new THREE.Vector3();
    const Tl = new THREE.Vector3();
    const Nl = new THREE.Vector3();
    const P = new THREE.Vector3();
    const up = new THREE.Vector3(0, 0, 1);

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: cv3d,
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0, 14);

      const geo = plateGeo();
      const aT = new Float32Array(GL_M);
      for (let i = 0; i < GL_M; i++) aT[i] = i / (GL_M - 1);
      geo.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 1));

      const U = () => ({ value: new THREE.Color() });
      mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        uniforms: {
          fA: U(),
          fB: U(),
          fC: U(),
          rA: U(),
          rB: U(),
          eLo: U(),
          eHi: U(),
          uOp: { value: 1 },
          uDeep: { value: 0.5 },
        },
      });

      mesh = new THREE.InstancedMesh(geo, mat, GL_M);
      mesh.frustumCulled = false;
      group = new THREE.Group();
      group.add(mesh);
      scene.add(group);

      cv2d.style.display = 'none';
      cv3d.style.display = 'block';
    } catch {
      renderer = null;
      cv3d.style.display = 'none';
      cv2d.style.display = 'block';
    }

    const hex = (c: string): [number, number, number] => {
      const clean = c.trim();
      return [
        parseInt(clean.slice(1, 3), 16),
        parseInt(clean.slice(3, 5), 16),
        parseInt(clean.slice(5, 7), 16),
      ];
    };

    function applyColors() {
      if (!mat) return;
      const cs = getComputedStyle(document.documentElement);
      const bgHex = cs.getPropertyValue('--bg').trim() || '#161616';
      const bg = hex(bgHex);
      const light = (bg[0] + bg[1] + bg[2]) / 3 > 128;

      const PColors = light
        ? {
            fA: 0x9fe0f0,
            fB: 0x9ae6dc,
            fC: 0xb9b0f4,
            rA: 0xf0a0ee,
            rB: 0xa88cf2,
            eLo: 0xdce6f2,
            eHi: 0xffffff,
            deep: 0.7,
          }
        : {
            fA: 0x49a6c2,
            fB: 0x3fb39d,
            fC: 0x7b6edf,
            rA: 0xd47ce8,
            rB: 0x8f7af0,
            eLo: 0x141a2c,
            eHi: 0x6b82b8,
            deep: 0.38,
          };

      (['fA', 'fB', 'fC', 'rA', 'rB', 'eLo', 'eHi'] as const).forEach((k) => {
        mat!.uniforms[k].value.set(PColors[k]);
      });
      mat.uniforms.uDeep.value = PColors.deep;
    }

    function kf(p: number) {
      const Nchaps = 6;
      const f = clamp(p * Nchaps - 0.5, 0, KF.length - 1);
      const i = Math.min(KF.length - 2, Math.floor(f));
      const e = sm(0.15, 0.85, f - i);
      const A = KF[i];
      const B = KF[i + 1];
      const o: Record<string, number> = {};
      for (const k in A) {
        o[k] = mix(A[k as keyof typeof A], B[k as keyof typeof B], e);
      }
      return o as typeof KF[0];
    }

    function resize() {
      if (!container) return;
      const r = container.getBoundingClientRect();
      const W = r.width;
      const H = r.height;
      if (!W || !H) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);

      if (renderer && camera) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
      }

      if (cv2d) {
        cv2d.width = Math.round(W * dpr);
        cv2d.height = Math.round(H * dpr);
        if (ctx2d) ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    applyColors();
    resize();

    window.addEventListener('resize', resize);

    function loop(now: number) {
      animId = requestAnimationFrame(loop);
      s += (scrollProgress - s) * 0.14;

      const r = container?.getBoundingClientRect();
      if (!r || !r.width || !r.height) return;
      const W = r.width;
      const H = r.height;

      if (renderer && scene && camera && group && mat && mesh) {
        const K = kf(s);
        const narrow = W < 820;
        const intro = reduce ? 1 : clamp((now - t0) / 1200);
        const visH = 2 * 14 * Math.tan((17.5 * Math.PI) / 180);
        const visW = visH * (W / H);
        const xf = narrow ? mix(0.5, K.x, 0.35) : K.x;

        group.position.set((xf - 0.5) * visW, (0.5 - K.y) * visH, 0);
        group.rotation.set(0.3 * Math.cos(s * 3.6), 0.42 * Math.sin(s * 5.2), (-K.a * Math.PI) / 180);
        group.scale.setScalar((K.w / 0.15) * (narrow ? 0.42 : 0.64) * (0.85 + 0.15 * intro));
        mat.uniforms.uOp.value = K.al * (narrow ? 0.55 : 1) * (0.15 + 0.85 * intro);

        const t = now / 1000;
        const ph = s * 6 + (reduce ? 0 : t * 0.2);
        const rot = s * 9 + (reduce ? 0 : t * 0.3);
        const A = 1.7;
        const Bz = 1.0;
        const kWave = 0.5;

        for (let i = 0; i < GL_M; i++) {
          const u = i / (GL_M - 1);
          const x = (u - 0.5) * GL_L;
          const a1 = kWave * x + ph;
          const a2 = 0.7 * kWave * x + ph * 1.3;
          P.set(x, A * Math.sin(a1), Bz * Math.cos(a2));
          T.set(1, A * kWave * Math.cos(a1), -Bz * 0.7 * kWave * Math.sin(a2)).normalize();

          B0.crossVectors(T, up).normalize();
          N0.crossVectors(B0, T);
          const phi = K.tw * u * Math.PI * 2 + rot;
          const cp = Math.cos(phi);
          const sp = Math.sin(phi);
          B.copy(B0).multiplyScalar(cp).addScaledVector(N0, sp);
          N.copy(N0).multiplyScalar(cp).addScaledVector(B0, -sp);

          const l = 0.5;
          const cl = Math.cos(l);
          const sl = Math.sin(l);
          Tl.copy(T).multiplyScalar(cl).addScaledVector(N, sl);
          Nl.copy(N).multiplyScalar(cl).addScaledVector(T, -sl);

          m.makeBasis(B, Nl, Tl);
          m.setPosition(P);
          mesh.setMatrixAt(i, m);
        }
        mesh.instanceMatrix.needsUpdate = true;
        renderer.render(scene, camera);
      } else if (ctx2d) {
        // 2D Fallback
        ctx2d.clearRect(0, 0, W, H);
        const K = kf(s);
        const S = Math.min(W, H);
        const L = Math.max(W, H);
        const narrow = W < 820;
        const intro = reduce ? 1 : clamp((now - t0) / 1200);
        const cx = W * (narrow ? mix(0.5, K.x, 0.35) : K.x);
        const cy = H * K.y;
        const th = (K.a * Math.PI) / 180;
        const len = K.len * L;
        const amp = K.amp * S * (narrow ? 0.8 : 1);
        const wid = K.w * S * (narrow ? 0.85 : 1);
        const t = now / 1000;
        const ph = s * 7 + (reduce ? 0 : t * 0.18);
        const rot = s * 16 + (reduce ? 0 : t * 0.35);
        const ux = Math.cos(th);
        const uy = Math.sin(th);
        const nx = -uy;
        const ny = ux;
        const MCount = 180;

        ctx2d.globalAlpha = K.al * (narrow ? 0.62 : 1) * (0.2 + 0.8 * intro);
        for (let k = 0; k < MCount; k++) {
          const u = k / (MCount - 1);
          const a = (u - 0.5) * len;
          const pp = u * Math.PI * 1.7 + ph;
          const lat = amp * Math.sin(pp);
          const x = cx + ux * a + nx * lat;
          const y = cy + uy * a + ny * lat;
          let tx = ux + nx * ((amp * Math.cos(pp) * Math.PI * 1.7) / len);
          let ty = uy + ny * ((amp * Math.cos(pp) * Math.PI * 1.7) / len);
          const tl = Math.hypot(tx, ty);
          tx /= tl;
          ty /= tl;
          const px = -ty;
          const py = tx;
          const phi = K.tw * u * Math.PI * 2 + rot;
          const c = Math.cos(phi);
          const hw = wid * (0.1 + 0.9 * Math.abs(c));
          const tk = (len / MCount) * 1.7;

          ctx2d.beginPath();
          ctx2d.moveTo(x - px * hw, y - py * hw);
          ctx2d.lineTo(x + px * hw, y + py * hw);
          ctx2d.lineTo(x + px * hw + tx * tk, y + py * hw + ty * tk);
          ctx2d.lineTo(x - px * hw + tx * tk, y - py * hw + ty * tk);
          ctx2d.closePath();
          ctx2d.fillStyle = u < 0.5 ? '#3fbfa8' : '#5b8def';
          ctx2d.fill();
        }
        ctx2d.globalAlpha = 1;
      }
    }

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      if (renderer) renderer.dispose();
    };
  }, [scrollProgress]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <canvas ref={canvas3dRef} id="rib3d" className="w-full h-full block" aria-hidden="true" />
      <canvas ref={canvas2dRef} id="rib" className="w-full h-full block" aria-hidden="true" />
    </div>
  );
};
