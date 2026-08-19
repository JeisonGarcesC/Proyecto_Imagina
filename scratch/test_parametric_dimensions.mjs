import { buildKuoAVDoble } from '../src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';

for (const ancho of [1200, 1500, 1650]) {
  for (const prof of [600, 750]) {
    for (const alt of [730, 750]) {
      const built = buildKuoAVDoble({ anchoMm: ancho, profundidadMm: prof, alturaMm: alt });
      const surfF = built.parts.find(p => p.codigo === 'LKSU010010_F');
      const pieIzq = built.parts.find(p => p.role === 'SUPPORT_LEFT' && p.partId.includes('FOOT'));
      const pieDer = built.parts.find(p => p.role === 'SUPPORT_RIGHT' && p.partId.includes('FOOT'));
      const paralF = built.parts.find(p => p.partId.includes('PARAL_IZQ_F'));

      console.log(`[Config: ${ancho}x${prof*2} H${alt}]`);
      console.log(`  Surf F Params: widthMm=${surfF.proceduralParams.widthMm}, depthMm=${surfF.proceduralParams.depthMm}, posY=${surfF.position[1].toFixed(3)}, posZ=${surfF.position[2].toFixed(3)}`);
      console.log(`  Pie Izq X=${pieIzq.position[0].toFixed(3)}, Pie Der X=${pieDer.position[0].toFixed(3)}`);
      console.log(`  Paral F GLB=${paralF.glb}, PosX=${paralF.position[0].toFixed(3)}, PosZ=${paralF.position[2].toFixed(3)}`);
    }
  }
}
