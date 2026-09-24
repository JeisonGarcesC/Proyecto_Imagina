import { LINK_WIDTHS, LINK_LEADER_WIDTHS, LINK_DEPTHS } from '../catalog/linkCatalog.js';
import { getLinkFinishOptions, LINK_SUPPORT_SHAPES } from '../catalog/linkFinishCatalog.js';
import { inputStyle, labelStyle, sectionStyle } from '../../../components/properties/shared/PropertyStyles.js';
import LinkLeaderFields from '../leader/ui/LinkLeaderFields.jsx';

export default function LinkConfigFields({config:c,onChange,disabled=false}) {
  const leader=c.type==='lider', widths=leader?LINK_LEADER_WIDTHS:LINK_WIDTHS;
  if (leader) return <LinkLeaderFields config={c} onChange={onChange} disabled={disabled}/>;
  const change=(key,value)=>onChange({...c,[key]:value,...(key==='type'&&value==='sencillo'?{surfaceMode:'principal'}:{})});
  const select=(label,key,options)=><label style={labelStyle}>{label}<select style={inputStyle} disabled={disabled} value={c[key]}
    onChange={e=>change(key,key.endsWith('Mm')||key==='puestos'?Number(e.target.value):e.target.value)}>
    {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
  </select></label>;
  const dimension=(label,key,options,min,max)=>c.modoEspecial ? <label style={labelStyle}>{label} (mm)<input style={inputStyle} disabled={disabled}
    type="number" min={min} max={max} step={1} value={c[key]} onChange={e=>change(key,Number(e.target.value))}/></label>
    : select(label,key,options.map(v=>({value:v,label:(v/10)+' cm'})));
  return <fieldset disabled={disabled} style={{border:0,padding:0,margin:0,minWidth:0}}>
    <div style={sectionStyle}><label style={labelStyle}>Tipo de configuración<select style={inputStyle} value={leader?'LEADER':'STANDARD'} onChange={e=>{
      const type=e.target.value==='LEADER'?'lider':'sencillo';
      onChange({...c,type,puestos:1,widthMm:type==='lider'?1500:1200,depthMm:600,surfaceMode:'principal',finishId:'FORMICA_30',modoEspecial:false,components:{}});
    }}><option value="STANDARD">Puesto estándar</option><option value="LEADER">Puesto líder</option></select></label></div>
    <div style={sectionStyle}>
      {!leader && <>{select('Tipo de puesto','type',[{value:'sencillo',label:'Sencillo'},{value:'doble',label:'Doble'}])}
        {select('Cantidad de puestos','puestos',Array.from({length:12},(_,i)=>({value:i+1,label:(i+1)+' '+(i?'puestos':'puesto')})))}
        {c.type==='doble'&&<div style={{fontSize:11,marginBottom:8}}>Cada módulo doble tiene dos superficies enfrentadas.</div>}</>}
      <label style={labelStyle}><input type="checkbox" checked={c.modoEspecial} onChange={e=>{
        const mode=e.target.checked;
        onChange({...c,modoEspecial:mode,...(!mode?{widthMm:widths.find(w=>w>=c.widthMm)||widths[0],depthMm:c.depthMm<=600?600:750,returnLengthMm:c.returnLengthMm<=900?900:1000}:{})});
      }}/> {leader?'Puesto líder rematable / medida especial':'Puesto especial'}</label>
      {dimension('Largo real','widthMm',widths,leader?1500:900,1800)}
      {dimension(leader?'Profundidad principal':'Profundidad por superficie','depthMm',LINK_DEPTHS,600,750)}
      {c.type==='doble'&&select('Configuración de superficie','surfaceMode',[{value:'principal',label:'Superficie principal'},{value:'plena',label:'Superficie plena doble'}])}
      {select('Acabado / tipo de superficie','finishId',getLinkFinishOptions(c.type).map(f=>({value:f.id,label:f.label})))}
    </div>
    <div style={sectionStyle}>{select('Tipo de costado','tipoCostado',LINK_SUPPORT_SHAPES)}
      {select('Acabado de costados','supportFinish',[{value:'PINTADO',label:'Pintado'},{value:'CROMADO',label:'Cromado'}])}
      {c.tipoCostado!=='RECT'&&<div role="note" style={{fontSize:11}}>Forma visual disponible. Código comercial LINK por confirmar; BOM parcial.</div>}
    </div>
    <div style={sectionStyle}>{select('Acceso para cableado','cableAccess',[{value:'none',label:'Sin grommet'},{value:'grommet',label:'Grommet de aluminio'}])}
      {c.cableAccess==='grommet'&&<>{select('Acabado del grommet','grommetFinish',[{value:'ALUMINIUM',label:'Aluminio anodizado'},{value:'PAINTED',label:'Pintado'}])}
        <div style={{fontSize:11}}>{leader?'Un grommet en la superficie principal.':'Un grommet por superficie.'}</div></>}
      <label style={labelStyle}><input type="checkbox" checked={c.hasDuct} onChange={e=>change('hasDuct',e.target.checked)}/> Incluir ducto intermedio</label>
      {c.hasDuct&&<div style={{fontSize:11}}>Un ducto por módulo. Acabado editable desde las propiedades.</div>}
    </div>
  </fieldset>;
}
