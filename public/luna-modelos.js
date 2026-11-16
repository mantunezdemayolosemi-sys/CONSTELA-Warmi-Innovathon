import * as T from '/vendor/three.module.js';

export const stations = [
  {id:'eventos', name:'Eventos', path:'/oportunidades', icon:'◎', tint:0x53dec8, x:-5.9, z:-4.6},
  {id:'retos', name:'Retos', path:'/retos', icon:'✦', tint:0xffce86, x:5.7, z:-5.2},
  {id:'portafolio', name:'Portafolio', path:'/portafolio', icon:'▤', tint:0xc0a2ff, x:-6, z:3.9},
  {id:'perfil', name:'Mi perfil', path:'/cuenta', icon:'◇', tint:0xfa9fc8, x:5.8, z:3.6},
];

const radius = 14.6;
export const walkRadius = 12.4;
export const elevation = (x,z) => 4.2 * (Math.sqrt(Math.max(0, 1 - (x*x + z*z) / radius**2)) - 1);
const pastel = (color, roughness = 0.68, metalness = 0.06) =>
  new T.MeshStandardMaterial({color, roughness, metalness});
const glow = color => new T.MeshBasicMaterial({color});
const milk = pastel(0xe6ddf5);
const shade = pastel(0x30254e);
const dark = pastel(0x19142e);
const glass = pastel(0x282654, 0.22, 0.5);

function mesh(parent, geometry, material, x, y, z) {
  const object = new T.Mesh(geometry, material);
  object.position.set(x,y,z);
  parent.add(object);
  return object;
}
const box = (group, material, x,y,z,w,h,d) => mesh(group,new T.BoxGeometry(w,h,d),material,x,y,z);
const sphere = (group, material, x,y,z, rx,ry,rz) => {
  const ball = mesh(group,new T.SphereGeometry(1,32,18),material,x,y,z);
  ball.scale.set(rx,ry,rz);
  return ball;
};
const disk = (group, material, x,y,z,r,h) =>
  mesh(group,new T.CylinderGeometry(r,r,h,48),material,x,y,z);
function ring(group, material, x,y,z,r,w) {
  const band = mesh(group,new T.TorusGeometry(r,w,8,60),material,x,y,z);
  band.rotation.x = Math.PI / 2;
  return band;
}

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function lunarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width=1024; canvas.height=512;
  const ctx=canvas.getContext('2d'), random=seededRandom(74);
  ctx.fillStyle='#b5a6ca'; ctx.fillRect(0,0,1024,512);
  for(let i=0;i<95;i++) {
    const x=random()*1024, y=random()*512, r=15+random()*100;
    const gradient=ctx.createRadialGradient(x,y,1,x,y,r);
    gradient.addColorStop(0,i%2?'#47386375':'#fff0ee83'); gradient.addColorStop(1,'#52457500');
    ctx.fillStyle=gradient; ctx.fillRect(x-r,y-r,2*r,2*r);
  }
  for(let i=0;i<18000;i++) {
    ctx.fillStyle=i%3?'#36274932':'#fff4f765';
    const size=random()*2.8+0.5;
    ctx.fillRect(random()*1024,random()*512,size,size);
  }
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  return texture;
}
function stars(scene) {
  const random=seededRandom(402);
  const positions=[], colors=[];
  for(let i=0;i<1500;i++) {
    const angle=random()*Math.PI*2, vertical=random()*2-1, radial=Math.sqrt(1-vertical*vertical);
    positions.push(Math.cos(angle)*radial*105,vertical*105,Math.sin(angle)*radial*105);
    const value=0.26+random()*0.60;
    colors.push(value*0.88,value*0.8,value);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const textureCanvas=document.createElement('canvas');textureCanvas.width=32;textureCanvas.height=32;
  const ctx=textureCanvas.getContext('2d'), gradient=ctx.createRadialGradient(16,16,0,16,16,16);
  gradient.addColorStop(0,'#ffffff');gradient.addColorStop(0.16,'#ffffffee');gradient.addColorStop(0.5,'#c2acff54');gradient.addColorStop(1,'#ffffff00');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
  scene.add(new T.Points(geometry,new T.PointsMaterial({
    size:2.7, sizeAttenuation:false, vertexColors:true, map:new T.CanvasTexture(textureCanvas),
    alphaTest:0.05, transparent:true, depthWrite:false,
  })));
}

export function makeLandscape(scene) {
  const random=seededRandom(108);
  stars(scene);
  const moon=mesh(scene,new T.SphereGeometry(1,128,72),
    new T.MeshStandardMaterial({map:lunarTexture(), roughness:0.98, color:0xf5e5ff}),0,-4.2,0);
  moon.scale.set(radius,4.2,radius);

  // Thin flight paths and a small ringed planet beyond the lunar surface.
  const orbit=ring(scene,new T.MeshBasicMaterial({color:0xbc9ff1,transparent:true,opacity:0.32}),0,-2.6,0,17.8,0.023);
  orbit.scale.set(1,0.83,1);orbit.rotation.set(1.23,-0.26,0.37);
  const orbit2=ring(scene,new T.MeshBasicMaterial({color:0x8c70d6,transparent:true,opacity:0.19}),0,-2.6,0,18.9,0.014);
  orbit2.rotation.copy(orbit.rotation);orbit2.scale.copy(orbit.scale);
  const planet=new T.Group();planet.position.set(13.5,1.1,-12.0);scene.add(planet);
  sphere(planet,pastel(0xa480bf),0,0,0,2.25,2.25,2.25);
  const planetaryRing=ring(planet, new T.MeshBasicMaterial({color:0xefb6d4,transparent:true,opacity:0.48}),0,0,0,3.15,0.065);
  planetaryRing.rotation.set(1.2,-0.26,0.28);
  const outer=ring(planet,new T.MeshBasicMaterial({color:0x936dbe,transparent:true,opacity:0.6}),0,0,0,3.48,0.027);
  outer.rotation.copy(planetaryRing.rotation);

  const craterDark=pastel(0x7f709a), craterLight=pastel(0xa497b8);
  const rockMaterials=[pastel(0x9782ae),pastel(0xcbbcce),pastel(0x7e7499)];
  for (const [x,z,r] of [[-10,-2,1.65],[-9.9,5.9,1.25],[9.9,1.2,1.4],[0,10.8,1.65],[9.1,-7.2,1.15],[-2.2,-10.5,1.2],[4.2,11.3,0.75],[-2.7,8.5,0.62]]) {
    const y=elevation(x,z);
    sphere(scene,craterDark,x,y-0.045,z,r,0.08,r*0.84);
    const edge=ring(scene,craterLight,x,y+0.045,z,r,0.105);edge.scale.y=0.84;
    edge.rotation.y += z * -0.024;edge.rotation.z = x * 0.024;
  }
  for(let i=0;i<170;i++) {
    const angle=random()*Math.PI*2, distance=3+random()*10.7;
    const x=Math.cos(angle)*distance, z=Math.sin(angle)*distance;
    if(stations.some(s=>Math.hypot(s.x-x,s.z-z)<3.1 || Math.hypot(s.x-x,s.z+2.4-z)<1.7))continue;
    const size=0.07+random()**3*0.42;
    const stone=mesh(scene,new T.DodecahedronGeometry(size,0),rockMaterials[i%rockMaterials.length],x,elevation(x,z)+size*0.28,z);
    stone.scale.y=0.5+random()*0.4;stone.rotation.set(random()*3,random()*3,random()*3);
  }

  const pavement=pastel(0x524466);
  const guide=glow(0xffdfad);
  disk(scene,pavement,0,0,0,1.9,0.075);
  ring(scene,glow(0xc9b1ff),0,0.06,0,1.72,0.026);
  ring(scene,glow(0xecb2ea),0,0.057,0,1.26,0.014);
  for(const s of stations){
    const from=new T.Vector3(0,0,0), to=new T.Vector3(s.x,0,s.z+2.4);
    const direction=to.clone().normalize(), side=new T.Vector3(direction.z,0,-direction.x);
    const steps=Math.ceil(to.length()/0.45);
    for(let i=4;i<steps;i++){
      const pos=from.clone().lerp(to,i/steps);pos.y=elevation(pos.x,pos.z)+0.038;
      const slab=box(scene,pavement,pos.x,pos.y,pos.z,0.95,0.07,0.40);slab.rotation.y=Math.atan2(direction.x,direction.z);
      if(i%2===0) for(const sign of [-1,1]){
        const marker=pos.clone().addScaledVector(side,sign*0.46);
        box(scene,guide,marker.x,marker.y+0.04,marker.z,0.085,0.055,0.085);
      }
    }
  }

  const beacon=mesh(scene,new T.OctahedronGeometry(0.43),glow(0xffdfa2),0,0.8,0);
  beacon.scale.y=1.5;
  const pedestal=disk(scene,shade,0,0.12,0,0.45,0.24);
  ring(scene,glow(0xfcd1ff),0,pedestal.position.y+0.14,0,0.35,0.026);
  return beacon;
}

export function makeStation(scene, station) {
  const {id,x,z,tint}=station;
  const model=new T.Group();model.position.set(x,elevation(x,z)+0.14,z);scene.add(model);
  const color=pastel(tint,0.46,0.17), light=glow(tint);
  disk(model,shade,0,-0.13,0.28,2.35,0.22);
  ring(model,light,0,-0.008,0.28,2.18,0.032);
  box(model,shade,0,-0.075,1.87,2.04,0.13,1.29);
  box(model,color,0,-0.015,2.40,1.65,0.045,0.20);

  // Build the facade around its opening so the information station has a real sliding door.
  box(model,milk,0,1.12,-0.25,3.42,2.21,2.54);
  box(model,milk,-1.16,1.07,1.26,1.1,2.12,0.49);
  box(model,milk,1.16,1.07,1.26,1.1,2.12,0.49);
  box(model,color,0,2.02,1.28,3.49,0.22,0.57);
  box(model,dark,0,0.82,1.11,1.21,1.66,0.21);
  box(model,shade,0,1.72,1.51,1.45,0.18,0.29);
  box(model,light,0,1.73,1.68,1.10,0.047,0.035);
  for (const side of [-1,1]) {
    box(model,shade,side*0.68,0.86,1.54,0.18,1.77,0.29);
    box(model,light,side*0.68,0.81,1.70,0.043,1.40,0.028);
    box(model,shade,side*1.22,1.18,1.54,0.61,0.72,0.12);
    box(model,glass,side*1.22,1.18,1.62,0.48,0.55,0.025);
    box(model,light,side*1.22,1.08,1.65,0.38,0.035,0.02);
    box(model,shade,side*1.73,0.42,0.20,0.16,0.77,1.96);
  }
  const doors=[-1,1].map(side=>{
    const door=new T.Group();door.position.set(side*0.301,0.84,1.57);model.add(door);
    box(door,color,0,0,0,0.589,1.56,0.085);
    box(door,shade,0,0.23,0.055,0.43,0.51,0.038);
    box(door,light,-side*0.16,-0.21,0.059,0.04,0.27,0.034);
    return door;
  });
  box(model,shade,0,2.24,0,3.68,0.21,3);
  let height=3.85;
  if(id==='eventos'){
    sphere(model,glass,0,2.34,-0.08,1.61,1.11,1.35);
    ring(model,light,0,2.56,-0.08,1.48,0.046);
    mast(model,color,light,-1.03,3.03,-0.28,0.96);
  } else if (id==='retos') {
    const roof=mesh(model,new T.CylinderGeometry(0.32,1.32,1.17,4),color,0,2.91,-0.03);
    roof.rotation.y=Math.PI/4;roof.scale.set(1.43,1,1.40);
    box(model,milk,0,3.17,0.65,0.74,0.25,0.15);
    mast(model,shade,light,0.57,3.31,-0.64,0.85);
  } else if (id==='portafolio') {
    box(model,milk,0,2.64,-0.24,2.62,0.68,2.16);
    box(model,color,0,3.01,-0.24,2.83,0.2,2.35);
    for(const p of [-0.65,0,0.65]){
      box(model,shade,p,2.70,0.86,0.47,0.33,0.08);
      box(model,light,p,2.66,0.92,0.35,0.035,0.03);
    }
    mast(model,shade,light,0.91,3.05,-0.5,0.65);
    height=3.69;
  } else {
    disk(model,color,0,2.58,-0.17,1.23,0.67);
    sphere(model,glass,0,2.80,-0.17,1.14,0.79,1.14);
    ring(model,light,0,3.10,-0.17,1.04,0.046);
    mast(model,shade,light,0.52,3.34,-0.37,0.51);
  }
  return {...station, doors, label:new T.Vector3(x,model.position.y+height+0.2,z), doorZ:z+1.9};
}

function mast(group, material, light, x,y,z,h) {
  disk(group,material,x,y+h/2,z,0.044,h);
  sphere(group,light,x,y+h,z,0.128,0.128,0.128);
}

export function makeAstronaut(scene) {
  const root=new T.Group(), suit=new T.Group();root.add(suit);scene.add(root);
  const lilac=pastel(0xa989ee), ivory=pastel(0xffe7e8), visor=pastel(0x231335,0.18,0.66);
  const sun=glow(0xffdc9b);
  sphere(suit,ivory,0,0.92,0,0.36,0.44,0.26);
  box(suit,lilac,0,0.95,-0.27,0.47,0.61,0.28);
  disk(suit,lilac,0,1.30,0,0.32,0.12);
  sphere(suit,ivory,0,1.57,0,0.45,0.43,0.43);
  sphere(suit,visor,0,1.60,0.265,0.36,0.245,0.235);
  sphere(suit,glow(0xcdaeff),-0.127,1.701,0.449,0.12,0.033,0.039);
  sphere(suit,sun,0.187,1.54,0.445,0.042,0.042,0.02);
  box(suit,lilac,0,0.97,0.237,0.22,0.18,0.06);
  sphere(suit,sun,0,0.99,0.281,0.059,0.059,0.031);
  const arms=[], legs=[];
  for(const sign of [-1,1]){
    const arm=new T.Group();arm.position.set(sign*0.37,1.15,0);arm.rotation.z=sign*0.20;suit.add(arm);arms.push(arm);
    sphere(arm,ivory,0,-0.20,0,0.13,0.25,0.128);
    sphere(arm,lilac,0,-0.39,0,0.127,0.123,0.13);
    const leg=new T.Group();leg.position.set(sign*0.17,0.60,0);suit.add(leg);legs.push(leg);
    sphere(leg,ivory,0,-0.20,0,0.14,0.25,0.15);
    sphere(leg,lilac,0,-0.47,0.065,0.15,0.125,0.205);
  }
  const shadow=sphere(scene,new T.MeshBasicMaterial({color:0x221939,transparent:true,opacity:0.37}),
    0,0,0,0.48,0.022,0.32);
  root.scale.setScalar(1.12);
  return {root,suit,arms,legs,shadow};
}
