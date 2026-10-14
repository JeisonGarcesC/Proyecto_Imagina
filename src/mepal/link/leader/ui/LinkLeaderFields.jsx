import { getLinkFinishOptions } from '../../rules/linkSurfaceFinishOptions.js';
import { LINK_CREDENZA_EXE_LENGTHS,LINK_CREDENZA_EXE_MODELS } from '../../rules/linkCredenzaExeRules.js';
import { inputStyle,labelStyle,sectionStyle } from '../../../../components/properties/shared/PropertyStyles.js';
import { LINK_LEADER_WIDTHS,LINK_LEADER_RETURN_LENGTHS,LINK_LEADER_RETURN_DEPTHS } from '../../catalog/linkCatalog.js';
// Puesto líder con las mismas medidas que Koncisa Plus: principal 150/165/180 cm × 60/75 cm y retorno 90/100 cm × 60 cm.
// Costados, grommets y ductos toman los valores por defecto de Link y se ajustan desde las propiedades de cada pieza.
const SPECIAL_MAIN_WIDTHS=[1500,1550,1600,1650,1700,1750,1800],SPECIAL_RETURN_LENGTHS=[900,950,1000],SPECIAL_RETURN_DEPTHS=[600,650,700,750];
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
        onChange({...c,modoEspecial:mode,...(!mode?{widthMm:LINK_LEADER_WIDTHS.find(n=>n>=c.widthMm)||LINK_LEADER_WIDTHS.at(-1),depthMm:c.depthMm<=600?600:750,
          returnLengthMm:c.returnLengthMm<=900?900:1000,returnDepthMm:600}:{})});
      }}/> Puesto especial</label>
      {select('Largo real','widthMm',c.modoEspecial?mm(SPECIAL_MAIN_WIDTHS):cm(LINK_LEADER_WIDTHS))}
      {select('Ancho','depthMm',cm([600,750]))}
      {!c.leaderCredenza&&select('Acabado / tipo de superficie','finishId',getLinkFinishOptions().map(f=>({value:f.id,label:f.label})))}
      {!c.leaderCredenza&&<label style={labelStyle}><input type="checkbox" checked={c.cableAccess==='grommet'} onChange={e=>change('cableAccess',e.target.checked?'grommet':'none')}/> Grommet en superficie principal</label>}
    </div>
    <div style={sectionStyle}><b>{c.leaderCredenza?'Credenza':'Superficie de retorno'}</b>
      <label style={labelStyle}><input type="checkbox" checked={c.leaderCredenza} onChange={e=>onChange({...c,leaderCredenza:e.target.checked,finishId:'FORMICA_30',...(e.target.checked?{cableAccess:'none',leaderReturnGrommet:false}:{cableAccess:'grommet'})})}/> Sustituir retorno por credenza</label>
      {select('Lado','side',[{value:'derecha',label:'Derecha'},{value:'izquierda',label:'Izquierda'}])}
      {c.leaderCredenza?<>{select('Modelo','credenzaModel',LINK_CREDENZA_EXE_MODELS.map(m=>({value:m.value,label:m.label})))}
        {select('Largo de credenza','credenzaLengthMm',cm(LINK_CREDENZA_EXE_LENGTHS))}
        <div style={{fontSize:11}}>Referencia {c.credenzaModel}. Superficie principal de fórmica 30 mm con cableado a credenza.</div></>:
        <>{select('Largo real','returnLengthMm',c.modoEspecial?mm(SPECIAL_RETURN_LENGTHS):cm(LINK_LEADER_RETURN_LENGTHS))}
          {select('Ancho','returnDepthMm',c.modoEspecial?mm(SPECIAL_RETURN_DEPTHS):cm(LINK_LEADER_RETURN_DEPTHS))}
          <label style={labelStyle}><input type="checkbox" checked={!!c.components?.['return-support']?.pedestal} onChange={e=>component('return-support',{pedestal:e.target.checked})}/> Pedestal en el extremo del retorno</label></>}
    </div>
  </fieldset>;
}
