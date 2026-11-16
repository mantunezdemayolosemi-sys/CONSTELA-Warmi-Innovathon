import * as T from '/vendor/three.module.js';
import { stations, elevation, walkRadius, makeLandscape, makeStation, makeAstronaut } from './luna-modelos.js';

const controls = new Map([
  ['KeyW','up'],['ArrowUp','up'],['KeyA','left'],['ArrowLeft','left'],
  ['KeyS','down'],['ArrowDown','down'],['KeyD','right'],['ArrowRight','right'],
]);
const spawn = {x:0.5,z:3.3};

export function mountMoon(stage, {enterStation, unavailable}) {
  const viewport=stage.querySelector('.moon-viewport');
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.48;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.domElement.setAttribute('aria-hidden','true');
  viewport.prepend(renderer.domElement);

  const scene=new T.Scene();
  const camera=new T.OrthographicCamera(-18,18,13,-13,0.1,185);
  camera.position.set(0,24,37);
  camera.lookAt(0,-1.22,0);
  const sun=new T.DirectionalLight(0xffe2dc,2.68);sun.position.set(-8,12,6);
  const fill=new T.DirectionalLight(0xa6aaff,1.70);fill.position.set(8,5,-10);
  scene.add(new T.HemisphereLight(0xe5d4ff,0x725091,2.0),sun,fill);
  const beacon=makeLandscape(scene);
  const buildings=stations.map(station=>makeStation(scene,station));
  const astronaut=makeAstronaut(scene);
  astronaut.root.rotation.y=0.32;

  const signal=new AbortController(), options={signal:signal.signal};
  const labelLayer=stage.querySelector('.moon-labels');
  const labels=buildings.map(station=>{
    const label=document.createElement('span');
    label.className='moon-station-label';
    label.dataset.station=station.id;
    label.textContent=station.name;
    labelLayer.append(label);
    return label;
  });
  const open=stage.querySelector('[data-moon-action="enter"]');
  const prompt=stage.querySelector('.moon-prompt');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const keys=new Set(), touches=new Map();
  const vector=new T.Vector3(), position=new T.Vector2(spawn.x,spawn.z);
  let frame=0, running=false, previous=0, age=0, stride=0, y=0, vertical=0, facing=0.32;
  let nearby=null, opening=null, doorTime=0, width=0, height=0;

  function canWalk(x,z){
    return Math.hypot(x,z)<walkRadius &&
      !buildings.some(station=>Math.abs(x-station.x)<1.99 && z>station.z-1.88 && z<station.z+1.88);
  }
  function jump(){
    if(running && !opening && y===0)vertical=5.3;
  }
  function interact(){
    if(!running || opening || !nearby)return;
    keys.clear();touches.clear();
    opening=nearby;doorTime=0;open.disabled=true;
    prompt.textContent='Abriendo ' + opening.name + '…';
  }
  function updateNearby(){
    const station=buildings.find(s=>Math.hypot(s.x-position.x,s.doorZ-position.y)<1.75) ?? null;
    if(nearby===station)return;
    nearby=station;
    open.disabled=!station;
    prompt.textContent=station ? 'Puerta de ' + station.name + ' · Pulsa E'
      : 'Acércate a la entrada de una estación.';
    labels.forEach((label,i)=>label.classList.toggle('is-nearby',buildings[i]===station));
  }
  function input(event){
    if (!running || event.ctrlKey || event.metaKey || event.altKey ||
        event.target.closest?.('input, textarea, select, button, a, [contenteditable]'))return;
    if(controls.has(event.code)){
      event.preventDefault();
      keys.add(event.code);
    }else if(event.code==='Space' || event.code==='KeyE'){
      event.preventDefault();
      if(!event.repeat)(event.code==='Space'?jump:interact)();
    }
  }
  const release = () => { keys.clear(); touches.clear(); };
  window.addEventListener('keydown',input,options);
  window.addEventListener('keyup',event=>keys.delete(event.code),options);
  window.addEventListener('blur',release,options);
  stage.addEventListener('focusout',release,options);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();unavailable();},options);
  stage.querySelectorAll('[data-moon-move]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{
      event.preventDefault();button.setPointerCapture(event.pointerId);touches.set(event.pointerId,button.dataset.moonMove);
    },options);
    for (const type of ['pointerup','pointercancel','lostpointercapture'])
      button.addEventListener(type,event=>touches.delete(event.pointerId),options);
    button.addEventListener('click',event=>{
      if(event.detail!==0 || !running || opening)return;
      const directions={up:[0,-1],left:[-1,0],down:[0,1],right:[1,0]};
      const [dx,dz]=directions[button.dataset.moonMove];
      walk(dx,dz,0.18);
    },options);
  });
  open.addEventListener('click',interact,options);
  stage.querySelector('[data-moon-action="jump"]').addEventListener('click',jump,options);

  function placeLabels(){
    buildings.forEach((s,i)=>{
      vector.copy(s.label).project(camera);
      labels[i].style.left=`${(vector.x+1)*50}%`;
      labels[i].style.top=`${(1-vector.y)*50}%`;
    });
  }
  function resize(){
    const rect=viewport.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    width=rect.width;height=rect.height;
    const aspect=width/height, halfHeight=Math.max(12.35, 16.85/aspect);
    camera.top=halfHeight;camera.bottom=-halfHeight;
    camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);placeLabels();
  }
  const observer=new ResizeObserver(resize);
  observer.observe(viewport);

  function walk(dx,dz,dt) {
    const length=Math.hypot(dx,dz);
    if(!length)return;
    facing=Math.atan2(dx,dz);
    const x=position.x+dx/length*dt*5.8, z=position.y+dz/length*dt*5.8;
    if(canWalk(x,position.y))position.x=x;
    if(canWalk(position.x,z))position.y=z;
  }
  function draw(timestamp){
    if(!running)return;
    const dt=Math.min((timestamp-(previous||timestamp))*0.001,0.035);
    previous=timestamp;age+=dt;
    const active=new Set([...Array.from(keys,key=>controls.get(key)),...touches.values()]);
    const dx=Number(active.has('right'))-Number(active.has('left'));
    const dz=Number(active.has('down'))-Number(active.has('up'));
    const moving=!opening && Boolean(dx||dz);
    if(moving)walk(dx,dz,dt);
    if(vertical || y){
      y+=vertical*dt;vertical-=12.8*dt;
      if(y<=0){y=0;vertical=0;}
    }
    if(!opening){
      updateNearby();
    }else{
      doorTime += dt;
      const progress=reduce.matches ? 1 : Math.min(doorTime/0.38,1);
      opening.doors.forEach((door,i)=>{door.position.x=(i===0?-1:1)*(0.301+0.58*progress);});
      if(progress===1){
        const path=opening.path;
        pause();
        enterStation(path);
        if(running)frame=requestAnimationFrame(draw);
        return;
      }
    }

    const floor=elevation(position.x,position.y);
    astronaut.root.position.set(position.x,floor+y,position.y);
    astronaut.shadow.position.set(position.x,floor+0.022,position.y);
    astronaut.shadow.material.opacity=0.35/(1+y);
    astronaut.root.rotation.y=facing;
    stride=moving ? stride+dt*13 : 0;
    const swing=reduce.matches ? 0 : Math.sin(stride)*0.53;
    astronaut.suit.position.y=reduce.matches ? 0 : Math.abs(swing)*0.1;
    astronaut.legs.forEach((leg,i)=>{leg.rotation.x=(i===0?-1:1)*swing;});
    astronaut.arms.forEach((arm,i)=>{arm.rotation.x=(i===0?1:-1)*swing*0.62;});
    if(!reduce.matches){beacon.rotation.y=age*0.8;beacon.position.y=0.84+0.10*Math.sin(age*2.3);}
    if(width && height)renderer.render(scene,camera);
    frame=requestAnimationFrame(draw);
  }
  function pause(){
    running=false;cancelAnimationFrame(frame);release();previous=0;
  }
  function resume(){
    if(running)return;
    if(opening){
      opening.doors.forEach((door,i)=>{door.position.x=(i===0?-1:1)*0.301;});
      opening=null;nearby=null;open.disabled=true;
    }
    running=true;resize();updateNearby();
    frame=requestAnimationFrame(draw);
  }
  function reset(){
    pause();position.set(spawn.x,spawn.z);y=0;vertical=0;facing=0.32;
    nearby=null;open.disabled=true;prompt.textContent='Acércate a la entrada de una estación.';
  }
  function dispose(){
    pause();observer.disconnect();signal.abort();renderer.dispose();
    const resources=new Set();
    scene.traverse(object=>{
      if(object.geometry)resources.add(object.geometry);
      if(object.material){resources.add(object.material);if(object.material.map)resources.add(object.material.map);}
    });
    // Materials shared by the model module will re-upload if a new scene is created.
    resources.forEach(resource=>resource.dispose());
    renderer.domElement.remove();labelLayer.replaceChildren();
  }
  return {resume,pause,reset,dispose};
}
