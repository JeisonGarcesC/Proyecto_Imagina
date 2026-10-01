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
  const specialWidths = Array.from({length: 17}, (_, i) => 1051 + i * 50);
  const dimension=(label,key,options,min,max)=>c.modoEspecial ? select(label,key,specialWidths.map(v=>({value:v,label:v+' mm'})))
    : select(label,key,options.map(v=>({value:v,label:(v/10)+' cm'})));
  return <fieldset disabled={disabled} style={{border:0,padding:0,margin:0,minWidth:0}}>
    <div style={sectionStyle}><label style={labelStyle}>Tipo de configuración<select style={inputStyle} value="STANDARD" disabled>
      <option value="STANDARD">Superficie principal</option>
    </select></label></div>
    <div style={sectionStyle}>
      {!leader && <>{select('Tipo de puesto','type',[{value:'sencillo',label:'Individual'},{value:'doble',label:'Doble'}])}
        {select('Cantidad de puestos','puestos',Array.from({length:12},(_,i)=>({value:i+1,label:(i+1)+' '+(i?'puestos':'puesto')})))}
        {c.type==='doble'&&<div style={{fontSize:11,marginBottom:8}}>Cada módulo doble tiene dos superficies enfrentadas.</div>}</>}
      <label style={labelStyle}><input type="checkbox" checked={c.modoEspecial} onChange={e=>{
        const mode=e.target.checked;
        onChange({...c,modoEspecial:mode,...(!mode?{widthMm:widths.find(w=>w>=c.widthMm)||widths[0],depthMm:c.depthMm<=600?600:750,returnLengthMm:c.returnLengthMm<=900?900:1000}:{widthMm: 1051})});
      }}/> {leader?'Puesto líder rematable / medida especial':'Puesto especial'}</label>
      {dimension('Largo real','widthMm',widths,leader?1500:900,1800)}
      {c.type==='doble'&&select('Configuración de superficie','surfaceMode',[{value:'principal',label:'Superficie principal'},{value:'plena',label:'Superficie plena doble'}])}
      {select('Superficie de integración', 'integracionType', [
        {value: 'ninguna', label: 'Ninguna'},
        {value: 'recta', label: 'Integración esquinas rectas'},
        {value: 'redonda', label: 'Integración esquinas redondas'},
        {value: 'curva', label: 'Integración frente curvada'}
      ])}
      {c.integracionType && c.integracionType !== 'ninguna' && select('Lado de la integración', 'integracionSide', [
        {value: 'ambas', label: 'Ambos lados'},
        {value: 'izquierda', label: 'Izquierda'},
        {value: 'derecha', label: 'Derecha'}
      ])}
    </div>
    <div style={sectionStyle}>{select('Tipo de costado','tipoCostado',[{value:'Link',label:'Link'},{value:'Kuo',label:'Kuo'}])}
      {c.tipoCostado!=='Link'&&<div role="note" style={{fontSize:11}}>Forma visual disponible. Código comercial LINK por confirmar; BOM parcial.</div>}
    </div>
    <div style={sectionStyle}>
      <label style={labelStyle}>Acceso para cableado
        <select style={inputStyle} disabled value="grommet">
          <option value="grommet">Grommet de aluminio</option>
        </select>
      </label>
      {select('Acabado del grommet','grommetFinish',[{value:'ALUMINIUM',label:'Aluminio anodizado'},{value:'PAINTED',label:'Pintado'}])}
      <div style={{fontSize:11}}>{leader?'Un grommet en la superficie principal.':'Un grommet por superficie.'}</div>
      <label style={labelStyle}><input type="checkbox" checked={c.hasDuct} onChange={e=>change('hasDuct',e.target.checked)}/> Incluir ducto intermedio</label>
      {c.hasDuct&&<div style={{fontSize:11}}>Un ducto por módulo. Acabado editable desde las propiedades.</div>}
    </div>
    <div style={sectionStyle}>
      {c.type === 'doble' && (
        <>
          <label style={labelStyle}><input type="checkbox" checked={c.hasPantallaFrontal} onChange={e=>change('hasPantallaFrontal',e.target.checked)}/> Incluir pantalla frontal</label>
          {c.hasPantallaFrontal&&select('Acabado de pantalla frontal','pantallaFrontalMaterial',[
            {value:'formica',label:'Formica'},
            {value:'vidrio',label:'Vidrio'},
            {value:'melamina',label:'Melamina'},
            {value:'tela',label:'Tela'}
          ])}
        </>
      )}
      <label style={labelStyle}><input type="checkbox" checked={c.hasPantallaLateral} onChange={e=>{
        const checked = e.target.checked;
        const updates = { hasPantallaLateral: checked };
        if (checked && !c.pantallaLateralMaterial) updates.pantallaLateralMaterial = 'formica';
        onChange({ ...c, ...updates });
      }}/> Incluir pantalla lateral</label>
      {c.hasPantallaLateral&&select('Acabado de pantalla lateral','pantallaLateralMaterial',[
        {value:'formica',label:'Formica'},
        {value:'vidrio',label:'Vidrio'},
        {value:'melamina',label:'Melamina'},
        {value:'tela',label:'Tela'}
      ])}
    </div>
  </fieldset>;
}
