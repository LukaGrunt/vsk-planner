import React from 'react';
import { createRoot } from 'react-dom/client';
import ExportModal from '../src/ExportModal';
import { MEMBER_FIELDS, buildMembersReport, personKey } from '../src/exports';
const members = ['Andrej Benčina','Žiga Šušteršič','Ana Zupan','Luka Ravnikar','Marko Novak','Peter Pekolj'].map((n,i)=>({ime:n.split(' ')[0],priimek:n.split(' ')[1],email:`u${i}@x.si`,morsStevilo:'M-'+i,membershipPaid:i%2==0}));
window.__toasts=[]; window.__rows=null;
const App = () => <ExportModal title="Izvoz članov" subtitle="Izberi koga in katere podatke" storageKey="members"
  scopes={[{value:'all',label:'Vsi'},{value:'paid',label:'Plačani'},{value:'unpaid',label:'Neplačani'}]}
  fields={[...MEMBER_FIELDS,{key:'prisotnost',label:'Prisotnost (obdobje)'}]} showPeriod periodRequiredFor="prisotnost"
  supabase={{}} showToast={(m,t)=>window.__toasts.push([t,m])} onClose={()=>{}}
  loadPeople={async()=>{ await new Promise(r=>setTimeout(r,200)); return members.map(m=>({key:personKey(m),name:`${m.ime} ${m.priimek}`,sub:m.email})); }}
  buildReport={async (o)=>{ const r=buildMembersReport({members,posts:[],fieldKeys:o.fieldKeys,scope:o.scope,picked:o.picked,ctx:{}}); window.__rows=r.rows; return r; }} />;
createRoot(document.getElementById('root')).render(<App/>);
