import { getLinkFinishOptions } from '../../rules/linkSurfaceFinishOptions.js';
import { LINK_CREDENZA_EXE_LENGTHS,LINK_CREDENZA_EXE_MODELS } from '../../rules/linkCredenzaExeRules.js';
import { inputStyle,labelStyle,sectionStyle } from '../../../../components/properties/shared/PropertyStyles.js';
// Puesto líder: la superficie principal usa las mismas medidas que el puesto Link (120/150/180 cm y puesto especial).
// Costados, grommets y ductos toman los valores por defecto de Link y se ajustan desde las propiedades de cada pieza.
const SPECIAL_WIDTHS=Array.from({length:17},(_,i)=>1051+i*50);
export default function LinkLeaderFields({config:c,onChange,disabled=false}){
  const change=(key,value)=>onChange({...c,[key]:value});
  const component=(key,patch)=>onChange({...c,components:{...c.components,[key]:{...c.components?.[key],...patch}}});
  const select=(label,key,options)=><label style={labelStyle}>{label}<select style={inputStyle} value={c[key]} onChange={e=>change(key,key.endsWith('Mm')?Number(e.target.value):e.target.value)}>
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
  const cm=values=>values.map(n=>({value:n,label:n/10+' cm'}));
  const mm=values=>values.map(n=>({value:n,label:n+' mm'}));
  return <fieldset disabled={disabled} style={{border:0,padding:0,minWidth:0}}>
    <div style={sectionStyle}><b>Superficie principal</b>
      <label style={labelStyle}><input type="checkbox" checked={c.modoEspecial} onChange={e=>{
        const mode=e.target.checked;
        onChange({...c,modoEspecial:mode,...(!mode?{widthMm:[1200,1500,1800].find(n=>n>=c.widthMm)||1200,depthMm:c.depthMm<=600?600:750,
          returnLengthMm:[1200,1500,1800].find(n=>n>=c.returnLengthMm)||1200,returnDepthMm:c.returnDepthMm<=600?600:750}:{widthMm:1051,returnLengthMm:1051})});
      }}/> Puesto especial</label>
      {select('Largo real','widthMm',c.modoEspecial?mm(SPECIAL_WIDTHS):cm([1200,1500,1800]))}
      {select('Ancho','depthMm',cm([600,750]))}
      {!c.leaderCredenza&&select('Acabado / tipo de superficie','finishId',getLinkFinishOptions().map(f=>({value:f.id,label:f.label})))}
    </div>
    <div style={sectionStyle}><b>{c.leaderCredenza?'Credenza':'Superficie de retorno'}</b>
      <label style={labelStyle}><input type="checkbox" checked={c.leaderCredenza} onChange={e=>onChange({...c,leaderCredenza:e.target.checked,finishId:'FORMICA_30',...(e.target.checked?{cableAccess:'none',leaderReturnGrommet:false}:{cableAccess:'grommet'})})}/> Sustituir retorno por credenza</label>
      {select('Lado','side',[{value:'derecha',label:'Derecha'},{value:'izquierda',label:'Izquierda'}])}
      {c.leaderCredenza?<>{select('Modelo','credenzaModel',LINK_CREDENZA_EXE_MODELS.map(m=>({value:m.value,label:m.label})))}
        {select('Largo de credenza','credenzaLengthMm',cm(LINK_CREDENZA_EXE_LENGTHS))}
        <div style={{fontSize:11}}>Referencia {c.credenzaModel}. Superficie principal de fórmica 30 mm con cableado a credenza.</div></>:
        <>{select('Largo real','returnLengthMm',c.modoEspecial?mm(SPECIAL_WIDTHS):cm([1200,1500,1800]))}
          {select('Ancho','returnDepthMm',cm([600,750]))}
          <label style={labelStyle}><input type="checkbox" checked={!!c.components?.['return-support']?.pedestal} onChange={e=>component('return-support',{pedestal:e.target.checked})}/> Pedestal en el extremo del retorno</label></>}
    </div>
  </fieldset>;
}
