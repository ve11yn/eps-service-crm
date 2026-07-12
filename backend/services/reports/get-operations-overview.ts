import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { cachedQuery } from "@/lib/cache/query-cache";
import { CACHE_TAGS } from "@/lib/cache/cache-tags";

export type ReportFilters = { from?: string; to?: string; workerId?: string; service?: string; source?: string };
const rate=(part:number,total:number)=>total?part/total:0;
const sum=<T,>(rows:T[],fn:(row:T)=>number)=>rows.reduce((total,row)=>total+fn(row),0);
const category=(item:{item_group:string|null;item_type:string|null;title:string})=>item.item_group?.trim()||item.item_type?.trim()||item.title.split(/[-–:,]/)[0].trim()||"Uncategorised";

async function getOperationsOverviewUncached(filters:ReportFilters={}){
 const s=createAdminSupabaseClient();const results=await Promise.all([
  s.from("leads").select("id,source_channel_code,received_at,whatsapp_thread_id,title,summary,customer_request"),
  s.from("source_channels").select("code,label"),s.from("quotes").select("id,lead_id,project_id,status_code,total_amount,created_at"),
  s.from("projects").select("id,source_lead_id,source_channel_code,status_code,title,created_at,scheduled_start_at,scheduled_end_at,completed_at"),
  s.from("project_items").select("id,project_id,assigned_profile_id,status_code,title,item_group,item_type,quoted_amount,actual_cost,labour_cost,material_cost,started_at,completed_at,created_at,deferred_reason"),
  s.from("invoices").select("id,project_id,status_code,total_amount,balance_due_amount,due_at,paid_at,created_at"),
  s.from("payments").select("id,project_id,invoice_id,status_code,amount,created_at,verified_at"),
  s.from("purchases").select("project_id,total_cost,created_at,purchase_date"),s.from("profiles").select("id,display_name,role_code,is_active"),
  s.from("project_scope_changes").select("project_id,project_item_id,change_type,description,status,created_at"),
  s.from("project_field_updates").select("project_id,project_item_id,issue_type,update_type,created_at"),
  s.from("messages").select("thread_id,direction_code,sent_at"),
 ]);for(const result of results)if(result.error)throw result.error;
 const[leadR,sourceR,quoteR,projectR,itemR,invoiceR,paymentR,purchaseR,profileR,changeR,fieldR,messageR]=results;
 const from=filters.from?new Date(`${filters.from}T00:00:00`).getTime():-Infinity;const to=filters.to?new Date(`${filters.to}T23:59:59.999`).getTime():Infinity;
 const inRange=(value:string|null)=>{const time=value?new Date(value).getTime():NaN;return !Number.isNaN(time)&&time>=from&&time<=to};
 const allItems=itemR.data??[];const serviceValues=[...new Set(allItems.map(category))].sort();
 const matchingItems=allItems.filter(item=>(!filters.workerId||item.assigned_profile_id===filters.workerId)&&(!filters.service||category(item)===filters.service));
 const allowedProjectIds=new Set(matchingItems.map(item=>item.project_id));
 const projects=(projectR.data??[]).filter(project=>inRange(project.created_at)&&(!filters.source||project.source_channel_code===filters.source)&&(!filters.workerId&&!filters.service||allowedProjectIds.has(project.id)));
 const projectIds=new Set(projects.map(project=>project.id));const projectLeadIds=new Set(projects.map(project=>project.source_lead_id).filter(Boolean));
 const leads=(leadR.data??[]).filter(lead=>inRange(lead.received_at)&&(!filters.source||lead.source_channel_code===filters.source)&&(!filters.workerId&&!filters.service||projectLeadIds.has(lead.id)));
 const leadIds=new Set(leads.map(lead=>lead.id));const quotes=(quoteR.data??[]).filter(quote=>inRange(quote.created_at)&&((quote.lead_id&&leadIds.has(quote.lead_id))||(quote.project_id&&projectIds.has(quote.project_id))));
 const items=matchingItems.filter(item=>projectIds.has(item.project_id));const invoices=(invoiceR.data??[]).filter(invoice=>projectIds.has(invoice.project_id)&&inRange(invoice.created_at));
 const payments=(paymentR.data??[]).filter(payment=>projectIds.has(payment.project_id)&&inRange(payment.created_at));const purchases=(purchaseR.data??[]).filter(purchase=>projectIds.has(purchase.project_id)&&inRange(purchase.created_at));
 const changes=(changeR.data??[]).filter(change=>projectIds.has(change.project_id)&&inRange(change.created_at));const fieldUpdates=(fieldR.data??[]).filter(update=>projectIds.has(update.project_id)&&inRange(update.created_at));
 const sourceLabels=new Map((sourceR.data??[]).map(row=>[row.code,row.label]));const sourceCounts=new Map<string,number>();for(const lead of leads)sourceCounts.set(lead.source_channel_code,(sourceCounts.get(lead.source_channel_code)??0)+1);
 const leadSourceBreakdown=[...sourceCounts].map(([code,count])=>({code,label:sourceLabels.get(code)??code,count,share:rate(count,leads.length)})).sort((a,b)=>b.count-a.count);
 const leadsWithQuote=new Set(quotes.map(q=>q.lead_id).filter(Boolean));const quotesWithJob=new Set(quotes.filter(q=>q.project_id).map(q=>q.id));
 const revenue=sum(payments.filter(p=>p.status_code==="paid"),p=>Number(p.amount));const outstanding=sum(invoices.filter(i=>!["paid","cancelled"].includes(i.status_code)),i=>Number(i.balance_due_amount));
 const trackedItemCost=sum(items,i=>Number(i.actual_cost)+Number(i.labour_cost)+Number(i.material_cost));const purchaseCost=sum(purchases,p=>Number(p.total_cost));const totalCost=trackedItemCost+purchaseCost;
 const today=Date.now();const ageing=[{label:"Current",min:-Infinity,max:0,balance:0,count:0},{label:"1–30 days",min:1,max:30,balance:0,count:0},{label:"31–60 days",min:31,max:60,balance:0,count:0},{label:"61–90 days",min:61,max:90,balance:0,count:0},{label:"90+ days",min:91,max:Infinity,balance:0,count:0}];
 for(const invoice of invoices.filter(i=>Number(i.balance_due_amount)>0&&i.status_code!=="cancelled")){const days=invoice.due_at?Math.floor((today-new Date(invoice.due_at).getTime())/86400000):0;const bucket=ageing.find(a=>days>=a.min&&days<=a.max)!;bucket.balance+=Number(invoice.balance_due_amount);bucket.count++}
 const workerUtilisation=(profileR.data??[]).filter(p=>p.role_code==="field_worker").map(profile=>{const assigned=items.filter(i=>i.assigned_profile_id===profile.id);const completed=assigned.filter(i=>i.status_code==="completed");return{profileId:profile.id,displayName:profile.display_name,assigned:assigned.length,completed:completed.length,open:assigned.length-completed.length,utilisationRate:rate(completed.length,assigned.length)}}).filter(row=>row.assigned>0||!filters.workerId).sort((a,b)=>b.assigned-a.assigned);
 const durations=projects.filter(p=>p.completed_at&&(p.scheduled_start_at||p.created_at)).map(p=>(new Date(p.completed_at!).getTime()-new Date(p.scheduled_start_at??p.created_at).getTime())/36e5).filter(v=>v>=0);
 const rework=changes.filter(c=>c.change_type==="rework");const causeMap=new Map<string,number>();for(const change of rework){const cause=change.description.trim()||"Unspecified";causeMap.set(cause,(causeMap.get(cause)??0)+1)}for(const item of items.filter(i=>i.deferred_reason)){const cause=item.deferred_reason!;causeMap.set(cause,(causeMap.get(cause)??0)+1)}
 const serviceMap=new Map<string,{jobs:Set<string>;items:number;revenue:number;cost:number;completed:number;rework:number}>();for(const item of items){const key=category(item);const row=serviceMap.get(key)??{jobs:new Set<string>(),items:0,revenue:0,cost:0,completed:0,rework:0};row.jobs.add(item.project_id);row.items++;row.revenue+=item.status_code!=="deferred"?Number(item.quoted_amount):0;row.cost+=Number(item.actual_cost)+Number(item.labour_cost)+Number(item.material_cost);if(item.status_code==="completed")row.completed++;row.rework+=rework.filter(c=>c.project_item_id===item.id).length;serviceMap.set(key,row)}
 const complaintPattern=/complaint|dispute|unhappy|unsatisfied|poor service/i;const complaintLeads=leads.filter(l=>complaintPattern.test(`${l.title??""} ${l.summary??""} ${l.customer_request??""}`));const complaintIssues=fieldUpdates.filter(u=>u.issue_type==="scope_question");const complaints=complaintLeads.length+complaintIssues.length;
 const threadStats=new Map<string,{inbound?:string;outbound?:string}>();for(const message of messageR.data??[]){const row=threadStats.get(message.thread_id)??{};if(message.direction_code==="inbound"&&(!row.inbound||message.sent_at<row.inbound))row.inbound=message.sent_at;if(message.direction_code==="outbound"&&(!row.outbound||message.sent_at<row.outbound))row.outbound=message.sent_at;threadStats.set(message.thread_id,row)}const responseMinutes=[...threadStats.values()].filter(r=>r.inbound&&r.outbound&&r.outbound>=r.inbound).map(r=>(new Date(r.outbound!).getTime()-new Date(r.inbound!).getTime())/60000);
 return{filters,filterOptions:{workers:(profileR.data??[]).filter(p=>p.role_code==="field_worker"&&p.is_active).map(p=>({id:p.id,label:p.display_name})),services:serviceValues,sources:(sourceR.data??[]).map(row=>({id:row.code,label:row.label}))},leadSourceBreakdown,conversion:{totalLeads:leads.length,leadsWithQuote:leadsWithQuote.size,leadToQuoteRate:rate(leadsWithQuote.size,leads.length),totalQuotes:quotes.length,quotesWithJob:quotesWithJob.size,quoteToJobRate:rate(quotesWithJob.size,quotes.length)},finance:{revenue,outstanding,totalCost,margin:revenue-totalCost,marginRate:rate(revenue-totalCost,revenue)},paymentAgeing:ageing,workerUtilisation,completion:{completedJobs:durations.length,averageHours:durations.length?sum(durations,v=>v)/durations.length:null},rework:{count:rework.length,rate:rate(rework.length,items.length),causes:[...causeMap].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count)},complaints:{count:complaints,rate:rate(complaints,leads.length)},servicePerformance:[...serviceMap].map(([service,row])=>({service,jobs:row.jobs.size,items:row.items,completed:row.completed,rework:row.rework,revenue:row.revenue,cost:row.cost,margin:row.revenue-row.cost})).sort((a,b)=>b.jobs-a.jobs),response:{averageMinutes:responseMinutes.length?sum(responseMinutes,v=>v)/responseMinutes.length:null,samples:responseMinutes.length}};
}

const getOperationsOverviewCached = cachedQuery(
 ["reports", "operations-overview"],
 getOperationsOverviewUncached,
 30,
 [CACHE_TAGS.reports],
);

export async function getOperationsOverview(filters: ReportFilters = {}) {
 return getOperationsOverviewCached(filters);
}
