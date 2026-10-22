import { LINK_WIDTHS, LINK_DEPTHS } from '../catalog/linkCatalog.js';
import { getLinkFinishOptions, LINK_SUPPORT_SHAPES } from '../catalog/linkFinishCatalog.js';
import { inputStyle, labelStyle, sectionStyle } from '../../../components/properties/shared/PropertyStyles.js';
import LinkLeaderFields from '../leader/ui/LinkLeaderFields.jsx';
import { LINK_CREDENZA_EXE_LENGTHS, LINK_CREDENZA_EXE_SIDES, LINK_CREDENZA_EXE_MODELS } from '../rules/linkCredenzaExeRules.js';

// Tipos del selector superior: Link (sencillo/doble), puesto líder (superficie principal + retorno o credenza) y credenza sola.
const toLeaderConfig = c => ({ ...c, type: 'lider', puestos: 1, surfaceMode: 'principal', modoEspecial: false, widthMm: 1500, depthMm: c.depthMm <= 600 ? 600 : 750,
  returnLengthMm: 900, returnDepthMm: 600, finishId: 'FORMICA_30', components: {}, cableAccess: 'grommet', integracionType: 'ninguna', hasPantallaFrontal: false, hasPantallaLateral: false, hasPantallaFalda: false });
const toStandardConfig = c => ({ ...c, type: 'sencillo', puestos: 1, surfaceMode: 'principal', modoEspecial: false, widthMm: 1200, depthMm: c.depthMm <= 600 ? 600 : 750,
  finishId: 'FORMICA_30', components: {}, cableAccess: 'grommet', leaderCredenza: false, leaderReturnGrommet: false });

export default function LinkConfigFields({config:c,onChange,disabled=false}) {
  const leader=c.type==='lider', alone=c.type==='credenza', is120=c.type==='puesto120', widths=LINK_WIDTHS;
  const change=(key,value)=>{
    if (key === 'type') {
      const next = { ...c, type: value };
      if (value === 'sencillo') {
        next.surfaceMode = 'principal';
        if (!['ninguna', 'individual'].includes(next.integracionType)) {
          next.integracionType = 'ninguna';
          next.integracionSide = 'derecha';
        }
      } else if (value === 'doble' && next.integracionType === 'individual') {
        next.integracionType = 'ninguna';
        next.integracionSide = 'derecha';
      }
      if (value !== 'sencillo') next.hasPantallaFalda = false;
      if (value !== 'doble') next.hasPantallaFrontal = false;
      onChange(next);
      return;
    }
    onChange({ ...c, [key]: value });
  };
  const select=(label,key,options)=><label style={labelStyle}>{label}<select style={inputStyle} disabled={disabled} value={c[key]}
    onChange={e=>change(key,key.endsWith('Mm')||key==='puestos'?Number(e.target.value):e.target.value)}>
    {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
  </select></label>;
  const specialWidths = Array.from({length: 17}, (_, i) => 1051 + i * 50);
  const dimension=(label,key,options,min,max)=>c.modoEspecial ? select(label,key,specialWidths.map(v=>({value:v,label:v+' mm'})))
    : select(label,key,options.map(v=>({value:v,label:(v/10)+' cm'})));
  return <fieldset disabled={disabled} style={{border:0,padding:0,margin:0,minWidth:0}}>
    <div style={sectionStyle}><label style={labelStyle}>Tipo de configuración<select style={inputStyle} value={leader?'LEADER':alone?'CREDENZA':is120?'120':'LINK'}
      onChange={e=>{
        const value=e.target.value;
        if(value==='LEADER')onChange(leader?c:toLeaderConfig(c));
        else if(value==='CREDENZA')onChange(alone?c:{...c,type:'credenza'});
        else if(value==='120')onChange(is120?c:{...c,type:'puesto120',disposicion120:'individual',side120:'derecha',widthMm:1200,depthMm:600,puestos:1,hasDuct:true,cableAccess:'grommet',integracionType:'ninguna'});
        else onChange(leader?toStandardConfig(c):alone||is120?{...c,type:'sencillo'}:c);
      }}>
      <option value="LINK">Link</option>
      <option value="LEADER">Puesto líder (retorno o credenza)</option>
      <option value="CREDENZA">Credenza sola</option>
      <option value="120">Puesto 120° / 360°</option>
    </select></label></div>
    {leader?<LinkLeaderFields config={c} onChange={onChange} disabled={disabled}/>:alone?<div style={sectionStyle}>
      {select('Modelo','credenzaModel',LINK_CREDENZA_EXE_MODELS.map(m=>({value:m.value,label:m.label})))}
      {select('Lado','side',LINK_CREDENZA_EXE_SIDES)}
      {select('Largo','credenzaLengthMm',LINK_CREDENZA_EXE_LENGTHS.map(v=>({value:v,label:(v/10)+' cm'})))}
      <div style={{fontSize:11}}>Referencia {c.credenzaModel}.</div>
    </div>:is120?<div style={sectionStyle}>
      {select('Disposición','disposicion120',[
        {value:'individual',label:'Puesto individual 120°'},
        {value:'doble',label:'Puesto doble 120°'},
        {value:'360',label:'Conjunto 360° 3 puestos'}
      ])}
      {c.disposicion120==='individual'&&select('Sentido','side120',[
        {value:'derecha',label:'Derecha'},
        {value:'izquierda',label:'Izquierda'}
      ])}
      {select('Profundidad','depthMm',LINK_DEPTHS.map(v=>({value:v,label:(v/10)+' cm'})))}
      {select('Tipo de costado','tipoCostado',[{value:'Link',label:'Link'},{value:'Kuo',label:'Kuo'}])}
      <label style={labelStyle}>Acceso para cableado
        <select style={inputStyle} disabled={disabled} value={c.cableAccess} onChange={e=>change('cableAccess',e.target.value)}>
          <option value="grommet">Grommet de aluminio</option>
          <option value="none">Sin grommet</option>
        </select>
      </label>
      {c.cableAccess==='grommet'&&select('Ubicación del grommet','grommetSide120',[
        {value:'izquierda',label:'Lado izquierdo (recto)'},
        {value:'derecha',label:'Lado derecho (ala recta)'},
        {value:'ambos',label:'Ambos lados rectos'}
      ])}
      {c.cableAccess==='grommet'&&select('Acabado del grommet','grommetFinish',[{value:'ALUMINIUM',label:'Aluminio anodizado'},{value:'PAINTED',label:'Pintado'}])}
      {c.disposicion120 !== 'individual' && (
        <label style={labelStyle}>
          <input type="checkbox" checked={c.hasDuct !== false} onChange={e=>change('hasDuct',e.target.checked)}/> Incluir ducto cableado
        </label>
      )}
    </div>:<>
    <div style={sectionStyle}>
      {!leader && <>{select('Tipo de puesto','type',[{value:'sencillo',label:'Individual'},{value:'doble',label:'Doble'}])}
        {select('Cantidad de puestos','puestos',Array.from({length:12},(_,i)=>({value:i+1,label:(i+1)+' '+(i?'puestos':'puesto')})))}
        {c.type==='doble'&&<div style={{fontSize:11,marginBottom:8}}>Cada módulo doble tiene dos superficies enfrentadas.</div>}</>}
      <label style={labelStyle}><input type="checkbox" checked={c.modoEspecial} onChange={e=>{
        const mode=e.target.checked;
        onChange({...c,modoEspecial:mode,...(!mode?{widthMm:widths.find(w=>w>=c.widthMm)||widths[0],depthMm:c.depthMm<=600?600:750,returnLengthMm:c.returnLengthMm<=900?900:1000}:{widthMm: 1051})});
      }}/> {leader?'Puesto líder rematable / medida especial':'Puesto especial'}</label>
      {dimension('Largo real','widthMm',widths,leader?1500:900,1800)}
      {select('Ancho','depthMm',LINK_DEPTHS.map(v=>({value:v,label:(v/10)+' cm'})))}
      {c.type==='doble'&&select('Configuración de superficie','surfaceMode',[{value:'principal',label:'Superficie principal'},{value:'plena',label:'Superficie plena doble'}])}
      {c.type==='sencillo'&&select('Superficie de integración', 'integracionType', [
        {value: 'ninguna', label: 'Ninguna'},
        {value: 'individual', label: 'Integración individual (con orificio)'}
      ])}
      {c.type==='doble'&&select('Superficie de integración', 'integracionType', [
        {value: 'ninguna', label: 'Ninguna'},
        {value: 'recta', label: 'Integración esquinas rectas'},
        {value: 'redonda', label: 'Integración esquinas redondas'},
        {value: 'curva', label: 'Integración frente curvada'},
        {value: '120', label: 'Superficie de integración a 120° (Bifurcación Y)'}
      ])}
      {c.integracionType&&c.integracionType!=='ninguna'&&select('Lado del banco', 'integracionSide', [
        {value: 'derecha', label: 'Extremo derecho'},
        {value: 'izquierda', label: 'Extremo izquierdo'},
        {value: 'ambas', label: 'Ambos extremos'}
      ])}
      {c.integracionType==='120'&&c.type==='doble'&&select('Puestos de integración (Alas)', 'integracion120Wing', [
        {value: 'ambas', label: 'Doble (2 puestos en Y)'},
        {value: 'izquierda', label: 'Solo un puesto (lado izquierdo)'},
        {value: 'derecha', label: 'Solo un puesto (lado derecho)'}
      ])}
    </div>
    <div style={sectionStyle}>{select('Tipo de costado','tipoCostado',[{value:'Link',label:'Link'},{value:'Kuo',label:'Kuo'}])}
      {c.tipoCostado!=='Link'&&<div role="note" style={{fontSize:11}}>Forma visual disponible. Código comercial LINK por confirmar; BOM parcial.</div>}
    </div>
    <div style={sectionStyle}>
      <label style={labelStyle}>Acceso para cableado
        <select style={inputStyle} disabled={disabled} value={c.cableAccess} onChange={e=>change('cableAccess',e.target.value)}>
          <option value="grommet">Grommet de aluminio</option>
          <option value="none">Sin grommet</option>
        </select>
      </label>
      {c.cableAccess==='grommet'&&select('Acabado del grommet','grommetFinish',[{value:'ALUMINIUM',label:'Aluminio anodizado'},{value:'PAINTED',label:'Pintado'}])}
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
        if (checked && !c.pantallaLateralSide) updates.pantallaLateralSide = 'ambos';
        onChange({ ...c, ...updates });
      }}/> Incluir pantalla lateral</label>
      {c.hasPantallaLateral && (
        <>
          {select('Lado de la pantalla lateral', 'pantallaLateralSide', [
            { value: 'ambos', label: 'Ambos lados' },
            { value: 'izquierda', label: 'Izquierda' },
            { value: 'derecha', label: 'Derecha' }
          ])}
          {select('Acabado de pantalla lateral', 'pantallaLateralMaterial', [
            { value: 'formica', label: 'Formica' },
            { value: 'vidrio', label: 'Vidrio' },
            { value: 'melamina', label: 'Melamina' },
            { value: 'tela', label: 'Tela' }
          ])}
        </>
      )}
      {c.type === 'sencillo' && (
        <>
          <label style={labelStyle}><input type="checkbox" checked={!!c.hasPantallaFalda} onChange={e=>{
            const checked = e.target.checked;
            onChange({ ...c, hasPantallaFalda: checked, ...(checked && !c.pantallaFaldaMaterial ? { pantallaFaldaMaterial: 'formica' } : {}) });
          }}/> Incluir falda pantalla</label>
        </>
      )}
    </div>
    </>}
  </fieldset>;
}
