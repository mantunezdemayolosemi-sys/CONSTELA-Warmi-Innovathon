import * as T from '/vendor/three.module.js';

export function makeSky(camera) {
  const sky=new T.Group();
  camera.add(sky);
  const canvas=document.createElement('canvas');
  canvas.width=32;canvas.height=32;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(16,16,0,16,16,16);
  gradient.addColorStop(0,'#ffffff');
  gradient.addColorStop(0.12,'#fff7ff');
  gradient.addColorStop(0.30,'#d6c4ff95');
  gradient.addColorStop(1,'#cbb0ff00');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
  const sparkle=new T.CanvasTexture(canvas);
  const layers=[];
  for(let layer=0;layer<3;layer++){
    const positions=[],colors=[];
    for(let i=0;i<380;i++){
      positions.push((Math.random()-0.5)*270,(Math.random()-0.5)*175,-155-Math.random()*15);
      const warmth=Math.random();
      colors.push(0.75+warmth*0.25,0.74+warmth*0.16,1);
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const material=new T.PointsMaterial({
      map:sparkle,size:layer===2?3.6:2.1,sizeAttenuation:false,
      vertexColors:true,transparent:true,opacity:0.65,depthWrite:false,
    });
    const points=new T.Points(geometry,material);sky.add(points);layers.push(points);
  }

  const tailGeometry=new T.BufferGeometry();
  const tailPositions=new Float32Array(24*3);
  const tailColors=new Float32Array(24*3);
  for(let i=0;i<24;i++){
    const fade=(1-i/24)**2;
    tailPositions[i*3]=-i/23*4;
    tailColors.set([0.84*fade,0.77*fade,fade],i*3);
  }
  tailGeometry.setAttribute('position',new T.BufferAttribute(tailPositions,3));
  tailGeometry.setAttribute('color',new T.BufferAttribute(tailColors,3));
  const tailMaterial=new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0,depthWrite:false});
  const streak=new T.Group();sky.add(streak);
  streak.add(new T.Line(tailGeometry,tailMaterial));
  const headMaterial=new T.SpriteMaterial({map:sparkle,transparent:true,opacity:0,depthWrite:false});
  const head=new T.Sprite(headMaterial);head.scale.set(0.6,0.6,1);streak.add(head);
  streak.visible=false;
  const start=new T.Vector3(),end=new T.Vector3(),direction=new T.Vector3();
  let elapsed=0, next=5.5, flight=-1;

  function update(dt, calm) {
    if(calm){
      streak.visible=false;
      flight=-1;next=elapsed+12;
      layers.forEach(layer=>{layer.material.opacity=0.66;});
      return;
    }
    elapsed+=dt;
    layers.forEach((layer,i)=>{
      layer.material.opacity=0.61+0.11*Math.sin(elapsed*0.45+i*2.1);
      layer.rotation.z=Math.sin(elapsed*0.018+i)*0.004;
    });
    if(flight<0 && elapsed>=next){
      flight=0;
      const h=Math.tan(T.MathUtils.degToRad(camera.fov/2))*110;
      const w=h*camera.aspect;
      const left=Math.random()>0.5;
      start.set((left?-0.85:0.75)*w,(0.48+Math.random()*0.31)*h,-110);
      end.set(start.x+(left?0.48:-0.48)*w,start.y-h*0.38,-110);
      direction.subVectors(end,start).normalize();
      streak.rotation.z=Math.atan2(direction.y,direction.x);
      streak.visible=true;
    }
    if(flight>=0){
      flight+=dt;
      const progress=Math.min(1,flight/2.7);
      streak.position.lerpVectors(start,end,progress);
      tailMaterial.opacity=Math.sin(progress*Math.PI)*0.58;
      headMaterial.opacity=Math.sin(progress*Math.PI)*0.82;
      if(progress===1){
        flight=-1;streak.visible=false;
        next=elapsed+12+Math.random()*12;
      }
    }
  }
  return {update};
}
