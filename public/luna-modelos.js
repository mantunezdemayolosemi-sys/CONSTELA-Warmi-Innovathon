import * as T from '/vendor/three.module.js';

export const stations = [
  {id:'eventos', name:'Eventos', path:'/oportunidades', icon:'◎', tint:0x53dec8, x:-5.9, z:-4.6},
  {id:'retos', name:'Retos', path:'/retos', icon:'✦', tint:0xffce86, x:5.7, z:-5.2},
  {id:'portafolio', name:'Portafolio', path:'/portafolio', icon:'▤', tint:0xc0a2ff, x:-6, z:3.9},
  {id:'perfil', name:'Mi perfil', path:'/cuenta', icon:'◇', tint:0xfa9fc8, x:5.8, z:3.6},
];

export const radius = 11.5;
export const stationScale = 1.32;
const up = new T.Vector3(0,1,0);

// The map coordinates are arc lengths from the north pole, in lunar units.
export function surfaceNormal(x,z) {
  const distance = Math.hypot(x,z);
  if (distance < 0.00001) return up.clone();
  const angle = distance / radius;
  return new T.Vector3(x / distance * Math.sin(angle), Math.cos(angle), z / distance * Math.sin(angle));
}

export function surfaceFrame(parent, normal, height = 0) {
  const group = new T.Group();
  group.position.copy(normal).multiplyScalar(radius + height);
  group.quaternion.setFromUnitVectors(up, normal);
  parent.add(group);
  return group;
}

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
  ctx.fillStyle='#c3bace'; ctx.fillRect(0,0,1024,512);
  for(let i=0;i<95;i++) {
    const x=random()*1024, y=random()*512, r=15+random()*100;
    const gradient=ctx.createRadialGradient(x,y,1,x,y,r);
    gradient.addColorStop(0,i%2?'#62567243':'#fff0ee55'); gradient.addColorStop(1,'#52457500');
    ctx.fillStyle=gradient; ctx.fillRect(x-r,y-r,2*r,2*r);
  }
  for(let i=0;i<9000;i++) {
    ctx.fillStyle=i%3?'#36274918':'#fff4f730';
    const size=random()*2.8+0.5;
    ctx.fillRect(random()*1024,random()*512,size,size);
  }
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  return texture;
}
export function makeLandscape(world) {
  const random = seededRandom(108);
  const craterCenters = [];
  for (let i = 0; i < 48; i++) {
    const angle = random() * Math.PI * 2;
    const vertical = random() * 2 - 1;
    const radial = Math.sqrt(1 - vertical * vertical);
    const normal = new T.Vector3(Math.cos(angle)*radial,vertical,Math.sin(angle)*radial);
    if (stations.some(s => normal.angleTo(surfaceNormal(s.x,s.z))*radius < 3.5)) continue;
    if (normal.y > 0.84) continue;
    craterCenters.push({normal, size:0.65+random()*1.25});
  }

  const geometry = new T.SphereGeometry(radius,160,100);
  const vertices = geometry.attributes.position;
  const point = new T.Vector3();
  for (let i=0; i<vertices.count; i++) {
    point.fromBufferAttribute(vertices,i).normalize();
    let depth=0;
    for (const crater of craterCenters) {
      const distance=point.distanceTo(crater.normal)*radius/crater.size;
      if(distance>1.5) continue;
      depth += -0.18*Math.exp(-distance*distance*3)
        + 0.08*Math.exp(-(((distance-0.92)/0.17)**2));
    }
    point.multiplyScalar(radius+depth);
    vertices.setXYZ(i,point.x,point.y,point.z);
  }
  geometry.computeVertexNormals();
  mesh(world,geometry,new T.MeshStandardMaterial({
    map:lunarTexture(),roughness:0.93,color:0xe2d8ea,
  }),0,0,0);

  const craterInside=pastel(0x897a9e), craterEdge=pastel(0xb4a5c8);
  for (const crater of craterCenters) {
    const frame=surfaceFrame(world,crater.normal,-0.055);
    const lip=ring(frame,craterEdge,0,0,0,crater.size,0.055);
    lip.scale.y=0.91;
    const basin=mesh(frame,new T.CircleGeometry(crater.size*0.77,48),craterInside,0,-0.062,0);
    basin.rotation.x=-Math.PI/2;
  }

  const stones=[pastel(0xafa1c1),pastel(0xc7b9cf),pastel(0x81738f)];
  const rockGeometry=new T.DodecahedronGeometry(1,0);
  const crystalGeometry=new T.ConeGeometry(0.24,1.15,5);
  const crystals=[
    new T.MeshStandardMaterial({color:0xb7e5dd,emissive:0x365c60,emissiveIntensity:0.5,roughness:0.3,metalness:0.16}),
    new T.MeshStandardMaterial({color:0xd9baff,emissive:0x5c3588,emissiveIntensity:0.4,roughness:0.35}),
  ];
  for(let i=0;i<210;i++){
    const angle=random()*Math.PI*2, vertical=random()*2-1;
    const normal=new T.Vector3(Math.cos(angle)*Math.sqrt(1-vertical*vertical),vertical,Math.sin(angle)*Math.sqrt(1-vertical*vertical));
    if(stations.some(s=>normal.angleTo(surfaceNormal(s.x,s.z))*radius<3.5) || normal.y>0.90)continue;
    const frame=surfaceFrame(world,normal,-0.025);
    const size=0.12+random()**2*0.51;
    const rock=mesh(frame,rockGeometry,stones[i%3],0,size*0.3,0);
    rock.scale.set(size,size*0.65,size);rock.rotation.y=random()*Math.PI;
    if(i%5===0){
      for(let j=0;j<3;j++){
        const crystal=mesh(frame,crystalGeometry,crystals[i%2],(j-1)*0.24,0.27+j*0.09,0.20);
        crystal.scale.setScalar(0.65+random()*0.8);
        crystal.rotation.z=(j-1)*0.20;
      }
    }
  }

  // Pavement and markers follow great-circle routes to the four doorways.
  const pavement=pastel(0x84748e), guide=glow(0xffdfad);
  const plaza=surfaceFrame(world,up,0.025);
  disk(plaza,pastel(0x554667),0,0,0,1.6,0.10);
  ring(plaza,glow(0xc9b1ff),0,0.065,0,1.45,0.022);
  ring(plaza,glow(0xecb2ea),0,0.065,0,1.06,0.016);
  for(const station of stations){
    const target=surfaceNormal(station.x,station.z);
    const frame=new T.Quaternion().setFromUnitVectors(up,target);
    const door=target.clone().multiplyScalar(radius)
      .add(new T.Vector3(0,0,2.5*stationScale).applyQuaternion(frame)).normalize();
    const route=new T.Quaternion().setFromUnitVectors(up,door);
    const steps=Math.ceil(up.angleTo(door)*radius/0.45);
    for(let i=4;i<=steps;i++){
      const normal=up.clone().applyQuaternion(new T.Quaternion().slerp(route,i/steps));
      const local=surfaceFrame(world,normal,0.014);
      const tangent=door.clone().addScaledVector(normal,-door.dot(normal)).normalize();
      tangent.applyQuaternion(local.quaternion.clone().invert());
      local.rotateY(Math.atan2(tangent.x,tangent.z));
      box(local,pavement,0,0,0,0.94,0.045,0.38);
      if(i%3===0)for(const side of [-1,1]){
        disk(local,shade,side*0.64,0.12,0,0.063,0.25);
        sphere(local,guide,side*0.64,0.27,0,0.065,0.065,0.065);
      }
    }
  }
  for(const [x,z,kind] of [[-9,1,'solar'],[8,0,'dish'],[0,-10,'solar'],[10,10,'flag'],[-12,-10,'flag'],[3,9,'rover']]){
    const frame=surfaceFrame(world,surfaceNormal(x,z));
    if(kind==='solar'){
      disk(frame,shade,0,0.48,0,0.09,0.96);
      const panel=new T.Group();panel.position.y=0.9;panel.rotation.x=-0.34;frame.add(panel);
      box(panel,milk,0,0,0,2,0.12,1.25);
      for(let col=0;col<4;col++)for(let row=0;row<2;row++)
        box(panel,pastel(0x51458a,0.3,0.4),-0.72+col*0.48,0.08,-0.3+row*0.6,0.42,0.02,0.52);
    }else if(kind==='dish'){
      disk(frame,shade,0,0.5,0,0.12,1);
      const bowl=new T.Group();bowl.position.y=1;bowl.rotation.z=-0.5;frame.add(bowl);
      const dish=mesh(bowl,new T.SphereGeometry(0.85,24,12,0,Math.PI*2,0,0.42*Math.PI),
        new T.MeshStandardMaterial({color:0xd1c8e2,side:T.DoubleSide}),0,0.6,0);
      dish.rotation.x=Math.PI;
      mast(bowl,shade,glow(0x93eddf),0,0.1,0,1.0);
    }else if(kind==='flag'){
      disk(frame,milk,0,1.05,0,0.045,2.1);
      box(frame,pastel(0xb79bda),0.4,1.75,0,0.8,0.48,0.04);
      const emblem=mesh(frame,new T.OctahedronGeometry(0.14),glow(0xffdfaa),0.38,1.75,0.055);
      emblem.scale.y=1.25;
    }else{
      box(frame,milk,0,0.4,0,0.9,0.40,1.15);
      for(const x of [-0.56,0.56])for(const z of [-0.35,0.35]){
        const wheel=disk(frame,shade,x,0.23,z,0.24,0.17);wheel.rotation.z=Math.PI/2;
      }
      box(frame,glass,0,0.66,-0.06,0.72,0.15,0.58);
      mast(frame,milk,glow(0xffd4a0),0.28,0.6,-0.3,0.7);
    }
  }
  const beacon=mesh(plaza,new T.OctahedronGeometry(0.35),glow(0xffdfa2),0,0.8,0);
  beacon.scale.y=1.5;
  disk(plaza,shade,0,0.11,0,0.39,0.22);
  return beacon;
}

export function makeStation(scene, station) {
  const {id,x,z,tint}=station;
  const normal=surfaceNormal(x,z);
  const model=surfaceFrame(scene,normal,0.10);
  model.scale.setScalar(stationScale);
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
  const label=new T.Object3D();label.position.set(0,height+0.32,0);model.add(label);
  const doorNormal=normal.clone().multiplyScalar(radius).add(
    new T.Vector3(0,0,2.0*stationScale).applyQuaternion(model.quaternion),
  ).normalize();
  return {...station,model,normal,doors,label,doorNormal,inverseFrame:model.quaternion.clone().invert()};
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
