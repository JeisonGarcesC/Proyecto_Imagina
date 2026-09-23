import { getLinkFinishOptions,LINK_SUPPORT_SHAPES } from '../../rules/linkSurfaceFinishOptions.js';
import { inputStyle,labelStyle,sectionStyle } from '../../../../components/properties/shared/PropertyStyles.js';
export default function LinkLeaderFields({config:c,onChange,disabled=false}){
  const change=(key,value)=>onChange({...c,[key]:value});
  const component=(key,patch)=>onChange({...c,components:{...c.components,[key]:{...c.components?.[key],...patch}}});
  const select=(label,key,options)=><label style={labelStyle}>{label}<select style={inputStyle} value={c[key]} onChange={e=>change(key,key.endsWith('Mm')?Number(e.target.value):e.target.value)}>
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
  const dimension=(label,key,options)=><label style={labelStyle}>{label}{c.modoEspecial?<input style={inputStyle} type="number" step={1} min={options[0]} max={options.at(-1)} value={c[key]} onChange={e=>change(key,Number(e.target.value))}/>:
    <select style={inputStyle} value={c[key]} onChange={e=>change(key,Number(e.target.value))}>{options.map(n=><option value={n} key={n}>{n/10} cm</option>)}</select>}</label>;
  return <fieldset disabled={disabled} style={{border:0,padding:0,minWidth:0}}>
    <div style={sectionStyle}><label style={labelStyle}>Tipo de configuración<select style={inputStyle} value="LEADER" onChange={()=>onChange({...c,type:'sencillo',widthMm:1200,depthMm:600,puestos:1,surfaceMode:'principal',components:{}})}>
      <option value="STANDARD">Puesto estándar</option><option value="LEADER">Puesto líder</option></select></label></div>
    <div style={sectionStyle}><b>Superficie principal</b>
      <label style={labelStyle}><input type="checkbox" checked={c.modoEspecial} onChange={e=>onChange({...c,modoEspecial:e.target.checked,...(!e.target.checked?{widthMm:1500,depthMm:600,returnLengthMm:900}:{})})}/> Puesto líder rematable / medida especial</label>
      {dimension('Largo principal','widthMm',[1500,1650,1800])}{dimension('Profundidad principal','depthMm',[600,750])}
      {!c.leaderCredenza&&select('Acabado / tipo de superficie','finishId',getLinkFinishOptions('lider').map(f=>({value:f.id,label:f.label})))}
    </div>
    <div style={sectionStyle}><b>{c.leaderCredenza?'Credenza':'Superficie de retorno'}</b>
      <label style={labelStyle}><input type="checkbox" checked={c.leaderCredenza} onChange={e=>onChange({...c,leaderCredenza:e.target.checked,finishId:'FORMICA_30'})}/> Usar credenza en lugar del retorno</label>
      {select('Lado','side',[{value:'derecha',label:'Derecha'},{value:'izquierda',label:'Izquierda'}])}
      {c.leaderCredenza?<>{select('Largo de credenza','leaderCredenzaLengthMm',[1200,1500].map(n=>({value:n,label:n/10+' cm'})))}
        <div style={{fontSize:11}}>Credenza LINK fija, dos gavetas archivo. Superficie principal de fórmica 30 mm: largo nominal + 5 cm.</div></>:
        <>{dimension('Largo del retorno','returnLengthMm',[900,1000])}<div style={{fontSize:11}}>Profundidad del retorno: 60 cm.</div>
          <label style={labelStyle}><input type="checkbox" checked={!!c.components?.['return-support']?.pedestal} onChange={e=>component('return-support',{pedestal:e.target.checked})}/> Pedestal en el extremo del retorno</label></>}
    </div>
    <div style={sectionStyle}><b>Cableado</b>
      <label style={labelStyle}><input type="checkbox" checked={c.cableAccess==='grommet'} onChange={e=>change('cableAccess',e.target.checked?'grommet':'none')}/> Grommet superficie principal</label>
      <label style={labelStyle}><input type="checkbox" checked={!!c.components?.['surface-0']?.floorDuct} onChange={e=>component('surface-0',{floorDuct:e.target.checked})}/> Ducto bajante a piso principal</label>
      {!c.leaderCredenza&&<><label style={labelStyle}><input type="checkbox" checked={c.leaderReturnGrommet} onChange={e=>change('leaderReturnGrommet',e.target.checked)}/> Grommet superficie de retorno</label>
        <label style={labelStyle}><input type="checkbox" checked={!!c.components?.['return-surface']?.floorDuct} onChange={e=>component('return-surface',{floorDuct:e.target.checked})}/> Ducto bajante a piso retorno</label></>}
      {(c.cableAccess==='grommet'||c.leaderReturnGrommet)&&select('Acabado del grommet','grommetFinish',[{value:'ALUMINIUM',label:'Aluminio anodizado'},{value:'PAINTED',label:'Pintado'}])}
      <label style={labelStyle}><input type="checkbox" checked={c.hasDuct} onChange={e=>change('hasDuct',e.target.checked)}/> Incluir ducto intermedio</label>
    </div>
    <div style={sectionStyle}><b>Costados</b>
      {select('Forma de costados','tipoCostado',LINK_SUPPORT_SHAPES)}
      {select('Acabado de costados','supportFinish',[{value:'PINTADO',label:'Pintado'},{value:'CROMADO',label:'Cromado'}])}
      {!c.leaderCredenza&&<label style={labelStyle}><input type="checkbox" checked={!!c.components?.['support-1']?.hasOutletBox} onChange={e=>component('support-1',{hasOutletBox:e.target.checked})}/> Caja tomas en costado de unión</label>}
    </div>
  </fieldset>;
}

