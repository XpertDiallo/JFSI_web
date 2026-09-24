/** Monthly dues include the month of adhesion. Future payments are advances,
 * never silently allocated against an older month. Only approved payments count. */
export function tariffFor(period:string,settings:any){const rates=settings.duesRates||[{from:"0000-01",amount:settings.monthly}];return [...rates].filter(r=>r.from<=period).sort((a,b)=>a.from.localeCompare(b.from)).at(-1)?.amount??settings.monthly}
export function duesStatement(member:any,payments:any[],settings:any,now=new Date()){
 const current=now.toISOString().slice(0,7),start=member.joined.slice(0,7);
 const approved=payments.filter(p=>p.status==='approved');
 const monthly=approved.filter(p=>p.type==='cotisation');
 const periods:string[]=[];
 if(member.status==='adherent'){
  const end=[current,...monthly.map(p=>p.period)].sort().at(-1)!;
  let date=new Date(start+'-01T00:00:00Z');
  for(let n=0;n<1200&&date.toISOString().slice(0,7)<=end;n++,date.setUTCMonth(date.getUTCMonth()+1))periods.push(date.toISOString().slice(0,7));
 }
 const months=periods.map(period=>{const paid=monthly.filter(p=>p.period===period).reduce((n,p)=>n+p.amount,0);const expected=period<=current?tariffFor(period,settings):0;return {period,expected,paid,due:Math.max(0,expected-paid),advance:Math.max(0,paid-expected),status:period>current?(paid?'Avance':'À venir'):paid<expected?'Arriéré':'À jour'}});
 const cardPaid=approved.filter(p=>p.type==='adhesion').reduce((n,p)=>n+p.amount,0);
 const card={expected:settings.adhesion,paid:cardPaid,due:member.status==='adherent'?0:Math.max(0,settings.adhesion-cardPaid),status:cardPaid>=settings.adhesion?'Payée':member.status==='adherent'?'Adhésion validée · justificatif antérieur':'À payer'};
 return {start,current,monthlyRate:tariffFor(current,settings),card,months,contributed:monthly.reduce((n,p)=>n+p.amount,0),due:months.reduce((n,p)=>n+p.due,0),advance:months.reduce((n,p)=>n+p.advance,0),pending:payments.filter(p=>p.status==='submitted').reduce((n,p)=>n+p.amount,0)};
}
