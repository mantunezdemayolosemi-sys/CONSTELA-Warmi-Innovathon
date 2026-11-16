import { pointsPerLevel } from './progreso.js';

export function createMoon({navigate,send,sessionExpired}) {
  const $=id=>document.getElementById(id);
  const view=$('moon-view'), stage=$('moon-stage'), notice=$('moon-error'), retry=$('moon-retry');
  const controls=stage.querySelector('.moon-controls');
  let game=null, epoch=0;

  function fallback() {
    game?.dispose();game=null;
    controls.hidden=true;
    $('moon-loading').hidden=false;
    $('moon-loading').textContent='La vista 3D no está disponible en este navegador. Puedes entrar con los accesos a las estaciones.';
    stage.classList.add('is-unavailable');
  }

  async function open() {
    const current=++epoch;
    view.hidden=false;view.setAttribute('data-pending','');
    controls.hidden=true;
    notice.hidden=true;retry.hidden=true;
    stage.classList.remove('is-unavailable');
    $('moon-loading').hidden=false;
    $('moon-loading').textContent='Preparando tu luna…';
    $('moon-title').focus({preventScroll:true});
    document.title='Mi luna · Constela';

    let data;
    try {
      data=await send('/web/universe',{refresh:true});
    } catch(error) {
      if(current!==epoch)return;
      if(error.status===401)return sessionExpired();
      $('moon-loading').hidden=true;
      notice.hidden=false;notice.textContent=error.message;
      retry.hidden=false;
      return;
    }
    if(current!==epoch)return;
    if(!data.interests)return navigate('/galaxias',{onboarding:true,replace:true});
    if(!data.discovery?.completed)return navigate('/descubrir',{replace:true});
    view.removeAttribute('data-pending');
    const progress=data.progress;
    $('moon-level').textContent='Nivel '+progress.level;
    $('moon-points').textContent=progress.points + (progress.points===1?' punto':' puntos');
    $('moon-stars').textContent='✦ ' + progress.stars + (progress.stars===1?' estrella':' estrellas');
    $('moon-progress').max=pointsPerLevel;$('moon-progress').value=progress.inLevel;
    $('moon-next-level').textContent=progress.pointsToNext+' puntos para el nivel '+(progress.level+1);

    try {
      const {mountMoon}=await import('./luna-escena.js');
      if(current!==epoch)return;
      game??=mountMoon(stage,{enterStation:navigate,unavailable:fallback});
      controls.hidden=false;
      $('moon-loading').hidden=true;
      game.resume();
    } catch {
      if(current===epoch)fallback();
    }
  }
  retry.addEventListener('click',open);
  function close(){epoch++;game?.pause();view.hidden=true;}
  function reset(){close();game?.reset();}
  return {open,close,reset};
}
