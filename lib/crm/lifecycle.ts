export const PROJECT_TRANSITIONS:Record<string,string[]>={scheduled:["in_progress"],in_progress:["qa_review"],qa_review:["in_progress","invoiced"],invoiced:["completed"],completed:[]};
export function canTransitionProject(from:string,to:string){return(PROJECT_TRANSITIONS[from]??[]).includes(to)}
export function projectCompletionHours(start:string|null,completed:string|null){if(!start||!completed)return null;const hours=(new Date(completed).getTime()-new Date(start).getTime())/36e5;return Number.isFinite(hours)&&hours>=0?hours:null}
