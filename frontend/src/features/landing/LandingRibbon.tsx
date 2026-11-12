import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ---------- Ruy-băng 3D (Three.js): lấy nguyên bản từ sample_ui/FairShare.html, không tinh chỉnh thiết kế ---------- */
const GL_M = 66, GL_L = 23, PW = 3.5, PH = .98;
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
  const w = PW / 2, h = PH / 2, c = .42, sh = new THREE.Shape();
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
    depth: .17,
    bevelEnabled: true,
    bevelThickness: .1,
    bevelSize: .1,
    bevelOffset: -.1,
    bevelSegments: 6,
    curveSegments: 2,
  });
  g.translate(0, 0, -.085);
  return g;
}

// Keyframe theo chương: tâm, góc trục, độ dài, biên độ uốn, nửa bề rộng, số vòng xoắn, độ đậm (nguyên bản FairShare.html)
const KF = [
  { x: .70, y: .50, a: -64, len: 1.9, amp: .20, w: .17, tw: 2.4, al: 1 },
  { x: .12, y: .60, a: -70, len: 1.9, amp: .18, w: .15, tw: 2.6, al: .5 },
  { x: .88, y: .30, a: -40, len: 1.8, amp: .16, w: .14, tw: 2.4, al: .5 },
  { x: .50, y: .74, a: -18, len: 1.9, amp: .14, w: .13, tw: 2.8, al: .38 },
  { x: .50, y: .92, a: -6,  len: 1.9, amp: .12, w: .12, tw: 2.6, al: .4 },
  { x: .90, y: .55, a: -58, len: 1.9, amp: .17, w: .15, tw: 2.4, al: .5 },
];

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a: number, b: number, x: number) => {
  const norm = clamp((x - a) / (b - a));
  return norm * norm * (3 - 2 * norm);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const hex = (c: string): [number, number, number] => {
  const s = c.trim();
  return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
};

function kf(p: number) {
  const N = 6;
  const f = clamp(p * N - .5, 0, KF.length - 1);
  const i = Math.min(KF.length - 2, Math.floor(f));
  const e = sm(.15, .85, f - i);
  const A = KF[i];
  const B = KF[i + 1];
  const o: Record<string, number> = {};
  for (const k in A) o[k] = mix(A[k as keyof typeof A], B[k as keyof typeof B], e);
  return o as typeof KF[0];
}

interface LandingRibbonProps {
  scrollProgress: number; // 0 to 1
}

export const LandingRibbon: React.FC<LandingRibbonProps> = ({ scrollProgress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const canvas3dRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const cv = canvas2dRef.current;
    const cv3d = canvas3dRef.current;
    if (!container || !cv || !cv3d) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = cv.getContext('2d');
    } catch {
      ctx = null;
    }

    const reduce =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    const t0 = performance.now();
    let animId = 0;
    let s = scrollProgress;
    let W = 0;
    let H = 0;
    let col: { s: [number, number, number][]; line: string } | null = null;

    // Three.js context structure identical to sample_ui/FairShare.html
    let gl: {
      renderer: THREE.WebGLRenderer;
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      mesh: THREE.InstancedMesh;
      mat: THREE.ShaderMaterial;
      group: THREE.Group;
      m: THREE.Matrix4;
      T: THREE.Vector3;
      B0: THREE.Vector3;
      N0: THREE.Vector3;
      B: THREE.Vector3;
      N: THREE.Vector3;
      Tl: THREE.Vector3;
      Nl: THREE.Vector3;
      P: THREE.Vector3;
      up: THREE.Vector3;
    } | null = null;

    function applyColors() {
      if (!gl) return;
      const u = gl.mat.uniforms;
      const bg = hex(getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#161616');
      const light = (bg[0] + bg[1] + bg[2]) / 3 > 128;
      const P = light
        ? {
            fA: 0x9fe0f0,
            fB: 0x9ae6dc,
            fC: 0xb9b0f4,
            rA: 0xf0a0ee,
            rB: 0xa88cf2,
            eLo: 0xdce6f2,
            eHi: 0xffffff,
            deep: .7,
          }
        : {
            fA: 0x49a6c2,
            fB: 0x3fb39d,
            fC: 0x7b6edf,
            rA: 0xd47ce8,
            rB: 0x8f7af0,
            eLo: 0x141a2c,
            eHi: 0x6b82b8,
            deep: .38,
          };
      (['fA', 'fB', 'fC', 'rA', 'rB', 'eLo', 'eHi'] as const).forEach((k) => u[k].value.set(P[k]));
      u.uDeep.value = P.deep;
    }

    function initGL() {
      try {
        const renderer = new THREE.WebGLRenderer({
          canvas: cv3d!,
          antialias: true,
          alpha: true,
          powerPreference: 'low-power',
        });
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
        camera.position.set(0, 0, 14);

        const geo = plateGeo();
        const aT = new Float32Array(GL_M);
        for (let i = 0; i < GL_M; i++) aT[i] = i / (GL_M - 1);
        geo.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 1));

        const U = () => ({ value: new THREE.Color() });
        const mat = new THREE.ShaderMaterial({
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
            uDeep: { value: .5 },
          },
        });

        const mesh = new THREE.InstancedMesh(geo, mat, GL_M);
        mesh.frustumCulled = false;
        const group = new THREE.Group();
        group.add(mesh);
        scene.add(group);

        gl = {
          renderer,
          scene,
          camera,
          mesh,
          mat,
          group,
          m: new THREE.Matrix4(),
          T: new THREE.Vector3(),
          B0: new THREE.Vector3(),
          N0: new THREE.Vector3(),
          B: new THREE.Vector3(),
          N: new THREE.Vector3(),
          Tl: new THREE.Vector3(),
          Nl: new THREE.Vector3(),
          P: new THREE.Vector3(),
          up: new THREE.Vector3(0, 0, 1),
        };

        cv!.style.display = 'none';
        cv3d!.style.display = 'block';
        applyColors();
      } catch {
        gl = null;
        cv3d!.style.display = 'none';
        cv!.style.display = 'block';
      }
    }

    function colors() {
      const cs = getComputedStyle(document.documentElement);
      col = {
        s: ['--rb1', '--rb2', '--rb3'].map((n) => hex(cs.getPropertyValue(n) || '#5b8def')),
        line: cs.getPropertyValue('--bg').trim() || '#161616',
      };
      if (gl) applyColors();
    }

    function build() {
      if (!container) return;
      const r = container.getBoundingClientRect();
      if (!r.width) return;
      W = r.width;
      H = r.height;
      const d = Math.min(2, window.devicePixelRatio || 1);

      cv!.width = Math.round(W * d);
      cv!.height = Math.round(H * d);
      if (ctx) ctx.setTransform(d, 0, 0, d, 0, 0);

      if (!gl) {
        initGL();
      }
      if (gl) {
        gl.renderer.setPixelRatio(d);
        gl.renderer.setSize(W, H, false);
        gl.camera.aspect = W / H;
        gl.camera.updateProjectionMatrix();
      }
    }

    function draw3D(now: number) {
      if (!gl) return;
      const { renderer, scene, camera, mesh, mat, group, m, T, B0, N0, B, N, Tl, Nl, P, up } = gl;
      const K = kf(s);
      const narrow = W < 820;
      const intro = reduce ? 1 : clamp((now - t0) / 1200);
      const visH = 2 * 14 * Math.tan((17.5 * Math.PI) / 180);
      const visW = visH * (W / H);
      const xf = narrow ? mix(.5, K.x, .35) : K.x;

      group.position.set((xf - .5) * visW, (.5 - K.y) * visH, 0);
      group.rotation.set(.3 * Math.cos(s * 3.6), .42 * Math.sin(s * 5.2), (-K.a * Math.PI) / 180);
      group.scale.setScalar((K.w / .15) * (narrow ? .42 : .64) * (.85 + .15 * intro));
      mat.uniforms.uOp.value = K.al * (narrow ? .55 : 1) * (.15 + .85 * intro);

      const t = now / 1000;
      const ph = s * 6 + (reduce ? 0 : t * .2);
      const rot = s * 9 + (reduce ? 0 : t * .3);
      const A = 1.7;
      const Bz = 1.0;
      const kWave = .5;

      for (let i = 0; i < GL_M; i++) {
        const u = i / (GL_M - 1);
        const x = (u - .5) * GL_L;
        const a1 = kWave * x + ph;
        const a2 = .7 * kWave * x + ph * 1.3;
        P.set(x, A * Math.sin(a1), Bz * Math.cos(a2));
        T.set(1, A * kWave * Math.cos(a1), -Bz * .7 * kWave * Math.sin(a2)).normalize();
        B0.crossVectors(T, up).normalize();
        N0.crossVectors(B0, T);
        const phi = K.tw * u * Math.PI * 2 + rot;
        const cp = Math.cos(phi);
        const sp = Math.sin(phi);
        B.copy(B0).multiplyScalar(cp).addScaledVector(N0, sp);
        N.copy(N0).multiplyScalar(cp).addScaledVector(B0, -sp);
        const l = .5;
        const cl = Math.cos(l);
        const sl = Math.sin(l); // các tấm nghiêng như bộ bài xòe
        Tl.copy(T).multiplyScalar(cl).addScaledVector(N, sl);
        Nl.copy(N).multiplyScalar(cl).addScaledVector(T, -sl);
        m.makeBasis(B, Nl, Tl);
        m.setPosition(P);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    }

    function draw2D(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const K = kf(s);
      const S = Math.min(W, H);
      const L = Math.max(W, H);
      const narrow = W < 820;
      const intro = reduce ? 1 : clamp((now - t0) / 1200);
      const cx = W * (narrow ? mix(.5, K.x, .35) : K.x);
      const cy = H * K.y;
      const th = (K.a * Math.PI) / 180;
      const len = K.len * L;
      const amp = K.amp * S * (narrow ? .8 : 1);
      const wid = K.w * S * (narrow ? .85 : 1);
      const t = now / 1000;
      const ph = s * 7 + (reduce ? 0 : t * .18);
      const rot = s * 16 + (reduce ? 0 : t * .35);
      const ux = Math.cos(th);
      const uy = Math.sin(th);
      const nx = -uy;
      const ny = ux;
      const M = 220;

      ctx.globalAlpha = K.al * (narrow ? .62 : 1) * (.2 + .8 * intro);
      for (let k = 0; k < M; k++) {
        const u = k / (M - 1);
        const a = (u - .5) * len;
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
        const hw = wid * (.1 + .9 * Math.abs(c));
        const tk = (len / M) * 1.7;

        if (col && col.s.length >= 3) {
          const g = u < .5 ? [col.s[0], col.s[1], u * 2] as const : [col.s[1], col.s[2], (u - .5) * 2] as const;
          const base = [0, 1, 2].map((j) => mix(g[0][j], g[1][j], g[2] as number));
          const lum = c >= 0 ? .94 + .16 * c : .78 + .1 * (-c);
          const rgb = base.map((v) => Math.min(255, v * lum));
          const dark = base.map((v) => v * .8);

          for (let pass = 0; pass < 2; pass++) {
            const k2 = pass ? .72 : 1;
            const off = pass ? -tk * .1 : 0;
            const hw2 = hw * (pass ? .97 : 1);
            const ax = x + tx * off;
            const ay = y + ty * off;
            ctx.beginPath();
            ctx.moveTo(ax + px * hw2 - (tx * tk * k2) / 2, ay + py * hw2 - (ty * tk * k2) / 2);
            ctx.lineTo(ax + px * hw2 + (tx * tk * k2) / 2, ay + py * hw2 + (ty * tk * k2) / 2);
            ctx.lineTo(ax - px * hw2 + (tx * tk * k2) / 2, ay - py * hw2 + (ty * tk * k2) / 2);
            ctx.lineTo(ax - px * hw2 - (tx * tk * k2) / 2, ay - py * hw2 - (ty * tk * k2) / 2);
            ctx.closePath();
            const cc = pass ? rgb : dark;
            ctx.fillStyle = `rgb(${cc[0] | 0},${cc[1] | 0},${cc[2] | 0})`;
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(now: number) {
      animId = requestAnimationFrame(loop);
      s += (scrollProgress - s) * .14;
      gl ? draw3D(now) : draw2D(now);
    }

    colors();
    build();
    animId = requestAnimationFrame(loop);

    const onResize = () => build();
    window.addEventListener('resize', onResize);

    const themeObserver = new MutationObserver(colors);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      cancelAnimationFrame(animId);
      themeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      if (gl) gl.renderer.dispose();
    };
  }, [scrollProgress]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <canvas ref={canvas3dRef} id="rib3d" className="w-full h-full block" aria-hidden="true" />
      <canvas ref={canvas2dRef} id="rib" className="w-full h-full block" aria-hidden="true" />
    </div>
  );
};
