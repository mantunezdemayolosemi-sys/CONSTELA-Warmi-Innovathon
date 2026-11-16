import * as T from '/vendor/three.module.js';
import { stations, radius, stationScale, surfaceNormal, makeLandscape, makeStation, makeAstronaut } from './luna-modelos.js';
import { makeSky } from './luna-cielo.js';

const controls=new Map([
  ['KeyW','up'],['ArrowUp','up'],['KeyA','left'],['ArrowLeft','left'],
  ['KeyS','down'],['ArrowDown','down'],['KeyD','right'],['ArrowRight','right'],
]);
const up=new T.Vector3(0,1,0);
const spawn=surfaceNormal(0,3.8);
const anchor=new T.Vector3(0,0.83,0.558).normalize();

export function mountMoon(stage,{enterStation,unavailable}) {
  const viewport=stage.querySelector('.moon-viewport');
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.domElement.setAttribute('aria-hidden','true');
  viewport.prepend(renderer.domElement);

  const scene=new T.Scene(),world=new T.Group();
  const camera=new T.PerspectiveCamera(43,1,0.1,230);
  scene.add(world,camera);
  const sky=makeSky(camera);
  const sun=new T.DirectionalLight(0xffeee2,2.7);sun.position.set(-15,24,18);
  const fill=new T.DirectionalLight(0x9c96ef,1.1);fill.position.set(18,5,-14);
  scene.add(new T.HemisphereLight(0xe8e4ff,0x39284c,1.45),sun,fill);
  const beacon=makeLandscape(world);
  const buildings=stations.map(station=>makeStation(world,station));
  const astronaut=makeAstronaut(world);
  world.quaternion.setFromUnitVectors(spawn,anchor);

  const signal=new AbortController(),options={signal:signal.signal};
  const labelLayer=stage.querySelector('.moon-labels');
  const labels=buildings.map(station=>{
    const label=document.createElement('span');
    label.className='moon-station-label';label.dataset.station=station.id;label.textContent=station.name;
    labelLayer.append(label);return label;
  });
  const open=stage.querySelector('[data-moon-action="enter"]');
  const prompt=stage.querySelector('.moon-prompt');
  const overviewButton=stage.querySelector('[data-moon-action="overview"]');
  const calmButton=stage.querySelector('[data-moon-action="calm"]');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const keys=new Set(),touches=new Map();
  const normal=spawn.clone();
  const heading=new T.Vector3(0,0,1).applyQuaternion(new T.Quaternion().setFromUnitVectors(up,normal));
  const inverse=new T.Quaternion(),rotation=new T.Quaternion(),alignment=new T.Quaternion();
  const worldNormal=new T.Vector3(),tangent=new T.Vector3(),right=new T.Vector3(),forward=new T.Vector3();
  const nextNormal=new T.Vector3(),local=new T.Vector3(),labelPosition=new T.Vector3(),toCamera=new T.Vector3();
  const targetCamera=new T.Vector3(),lookAt=new T.Vector3(0,1.2,0),cameraAxis=new T.Vector3(0,0.50,0.866).normalize();
  const bodyMatrix=new T.Matrix4(),bodyRight=new T.Vector3();
  let frame=0,running=false,previous=0,age=0,stride=0,heightAbove=0,vertical=0;
  let nearby=null,opening=null,doorTime=0,width=0,height=0;
  let overview=true,calm=reduce.matches,cameraReady=false;

  function updateViewButton(){
    overviewButton.textContent=overview?'Acercarme':'Vista completa';
    overviewButton.setAttribute('aria-label',overview?'Acercar la cámara a la astronauta':'Ver toda la luna');
  }
  function updateCalm(){
    calmButton.setAttribute('aria-pressed',String(calm));
    calmButton.textContent=calm?'Calma activada':'Calma';
  }
  updateViewButton();updateCalm();

  function canWalk(candidate){
    for(const station of buildings){
      local.copy(candidate).multiplyScalar(radius)
        .sub(station.normal.clone().multiplyScalar(radius)).applyQuaternion(station.inverseFrame);
      if(Math.abs(local.x)<1.91*stationScale && local.z>-1.60*stationScale && local.z<1.72*stationScale)return false;
    }
    return true;
  }
  function jump(){if(running&&!opening&&heightAbove===0)vertical=4.7;}
  function interact(){
    if(!running||opening||!nearby)return;
    keys.clear();touches.clear();opening=nearby;doorTime=0;open.disabled=true;
    prompt.textContent='Abriendo '+opening.name+'…';
  }
  function updateNearby(){
    const station=buildings.find(s=>normal.angleTo(s.doorNormal)*radius<1.65)??null;
    if(nearby===station)return;
    nearby=station;open.disabled=!station;
    prompt.textContent=station?'Puerta de '+station.name+' · Pulsa E':'Acércate a la entrada de una estación.';
    labels.forEach((label,i)=>label.classList.toggle('is-nearby',buildings[i]===station));
  }
  function input(event){
    if(!running||event.ctrlKey||event.metaKey||event.altKey||
      event.target.closest?.('input,textarea,select,button,a,[contenteditable]'))return;
    if(controls.has(event.code)){event.preventDefault();keys.add(event.code);}
    else if(event.code==='Space'||event.code==='KeyE'){
      event.preventDefault();if(!event.repeat)(event.code==='Space'?jump:interact)();
    }
  }
  const release=()=>{keys.clear();touches.clear();};
  window.addEventListener('keydown',input,options);
  window.addEventListener('keyup',event=>keys.delete(event.code),options);
  window.addEventListener('blur',release,options);
  document.addEventListener('visibilitychange',()=>{release();previous=0;},options);
  stage.addEventListener('focusout',release,options);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();unavailable();},options);
  stage.querySelectorAll('[data-moon-move]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{
      event.preventDefault();button.setPointerCapture(event.pointerId);touches.set(event.pointerId,button.dataset.moonMove);
    },options);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])
      button.addEventListener(type,event=>touches.delete(event.pointerId),options);
    button.addEventListener('click',event=>{
      if(event.detail!==0||!running||opening)return;
      const directions={up:[0,-1],left:[-1,0],down:[0,1],right:[1,0]};
      walk(...directions[button.dataset.moonMove],0.16);
    },options);
  });
  open.addEventListener('click',interact,options);
  stage.querySelector('[data-moon-action="jump"]').addEventListener('click',jump,options);
  overviewButton.addEventListener('click',()=>{overview=!overview;updateViewButton();release();},options);
  calmButton.addEventListener('click',()=>{calm=!calm;updateCalm();release();},options);
  reduce.addEventListener('change',()=>{calm=reduce.matches;updateCalm();},options);
  // Clicking the scene restores keyboard control after using one of its buttons.
  viewport.addEventListener('pointerdown',()=>stage.focus({preventScroll:true}),options);

  function placeLabels(){
    scene.updateMatrixWorld(true);
    buildings.forEach((station,i)=>{
      station.label.getWorldPosition(labelPosition);
      // Test the elevated label, so a roof above the horizon remains identifiable.
      toCamera.copy(labelPosition).sub(camera.position);
      const along=T.MathUtils.clamp(-camera.position.dot(toCamera)/toCamera.lengthSq(),0,1);
      local.copy(camera.position).addScaledVector(toCamera,along);
      const visible=local.length()>radius*0.99;
      labelPosition.project(camera);
      labels[i].hidden=!visible||labelPosition.z>1||Math.abs(labelPosition.x)>0.96||Math.abs(labelPosition.y)>0.93;
      labels[i].style.left=`${(labelPosition.x+1)*50}%`;
      labels[i].style.top=`${(1-labelPosition.y)*50}%`;
    });
  }
  function resize(){
    const rect=viewport.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    width=rect.width;height=rect.height;camera.aspect=width/height;camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  }
  const observer=new ResizeObserver(resize);observer.observe(viewport);

  function walk(dx,dz,dt){
    const length=Math.hypot(dx,dz);if(!length)return false;
    worldNormal.copy(normal).applyQuaternion(world.quaternion);
    right.set(1,0,0).applyQuaternion(camera.quaternion).addScaledVector(worldNormal,-right.dot(worldNormal)).normalize();
    forward.crossVectors(worldNormal,right).normalize();
    tangent.copy(right).multiplyScalar(dx/length).addScaledVector(forward,-dz/length);
    inverse.copy(world.quaternion).invert();
    tangent.applyQuaternion(inverse).normalize();
    const angle=dt*4.7/radius;
    nextNormal.copy(normal).multiplyScalar(Math.cos(angle)).addScaledVector(tangent,Math.sin(angle)).normalize();
    if(!canWalk(nextNormal))return false;
    normal.copy(nextNormal);
    heading.copy(tangent).addScaledVector(normal,-tangent.dot(normal)).normalize();
    if(overview){overview=false;updateViewButton();}
    return true;
  }
  function updateCamera(dt,moving){
    worldNormal.copy(normal).applyQuaternion(world.quaternion);
    rotation.setFromUnitVectors(worldNormal,anchor);
    alignment.copy(rotation).multiply(world.quaternion);
    world.quaternion.slerp(alignment,1-Math.exp(-dt*5));
    if(!calm&&!moving&&!nearby&&!opening){
      rotation.setFromAxisAngle(anchor,dt*0.018);
      world.quaternion.premultiply(rotation);
    }
    const fit=Math.max(1,0.95/camera.aspect);
    const distance=(overview?45:34.5)*fit;
    const targetHeight=overview?1.8:5.0;
    lookAt.y+=(targetHeight-lookAt.y)*(1-Math.exp(-dt*2.6));
    targetCamera.copy(cameraAxis).multiplyScalar(distance).add(lookAt);
    if(!cameraReady){camera.position.copy(targetCamera);cameraReady=true;}
    else camera.position.lerp(targetCamera,1-Math.exp(-dt*2.4));
    camera.lookAt(lookAt);
  }
  function draw(timestamp){
    if(!running)return;
    const dt=Math.min((timestamp-(previous||timestamp))*0.001,0.04);
    previous=timestamp;age+=dt;
    const active=new Set([...Array.from(keys,key=>controls.get(key)),...touches.values()]);
    const dx=Number(active.has('right'))-Number(active.has('left'));
    const dz=Number(active.has('down'))-Number(active.has('up'));
    const moving=!opening&&(dx||dz)?walk(dx,dz,dt):false;
    if(vertical||heightAbove){
      heightAbove+=vertical*dt;vertical-=10.5*dt;
      if(heightAbove<=0){heightAbove=0;vertical=0;}
    }
    if(!opening)updateNearby();
    else{
      doorTime+=dt;
      const progress=calm?1:Math.min(doorTime/0.42,1);
      opening.doors.forEach((door,i)=>{door.position.x=(i===0?-1:1)*(0.301+0.58*progress);});
      if(progress===1){const path=opening.path;pause();enterStation(path);return;}
    }
    astronaut.root.position.copy(normal).multiplyScalar(radius+heightAbove);
    astronaut.shadow.position.copy(normal).multiplyScalar(radius+0.025);
    astronaut.shadow.quaternion.setFromUnitVectors(up,normal);
    astronaut.shadow.material.opacity=0.34/(1+heightAbove);
    bodyRight.crossVectors(normal,heading).normalize();
    bodyMatrix.makeBasis(bodyRight,normal,heading);
    astronaut.root.quaternion.setFromRotationMatrix(bodyMatrix);
    stride=moving?stride+dt*12:0;
    const swing=reduce.matches?0:Math.sin(stride)*0.5;
    astronaut.suit.position.y=Math.abs(swing)*0.08;
    astronaut.legs.forEach((leg,i)=>{leg.rotation.x=(i===0?-1:1)*swing;});
    astronaut.arms.forEach((arm,i)=>{arm.rotation.x=(i===0?1:-1)*swing*0.62;});
    if(!calm){beacon.rotation.y+=dt*0.65;beacon.position.y=0.84+0.06*Math.sin(age*1.9);}
    updateCamera(dt,moving);sky.update(dt,calm);placeLabels();
    if(width&&height)renderer.render(scene,camera);
    frame=requestAnimationFrame(draw);
  }
  function pause(){running=false;cancelAnimationFrame(frame);release();previous=0;}
  function resume(){
    if(running)return;
    if(opening){
      opening.doors.forEach((door,i)=>{door.position.x=(i===0?-1:1)*0.301;});
      opening=null;nearby=null;open.disabled=true;
    }
    running=true;resize();updateNearby();frame=requestAnimationFrame(draw);
  }
  function reset(){
    pause();normal.copy(spawn);heightAbove=0;vertical=0;overview=true;cameraReady=false;
    world.quaternion.setFromUnitVectors(spawn,anchor);
    heading.set(0,0,1).applyQuaternion(new T.Quaternion().setFromUnitVectors(up,normal));
    nearby=null;open.disabled=true;prompt.textContent='Acércate a la entrada de una estación.';updateViewButton();
  }
  function dispose(){
    pause();observer.disconnect();signal.abort();renderer.dispose();
    const resources=new Set();
    scene.traverse(object=>{
      if(object.geometry)resources.add(object.geometry);
      if(object.material){resources.add(object.material);if(object.material.map)resources.add(object.material.map);}
    });
    resources.forEach(resource=>resource.dispose());
    renderer.domElement.remove();labelLayer.replaceChildren();
  }
  return {resume,pause,reset,dispose};
}
