import"server-only";import{createAdminSupabaseClient}from"@/lib/supabase/admin";import{logAuditEvent}from"@/backend/observability/audit";import type{Json}from"@/types/database";
export async function getConfigurationWorkspace() {
  const s = createAdminSupabaseClient();
  const [catalogs, pricingItems, projectStages, profiles, assignments, fieldUpdates] = await Promise.all([
    s.from("pricing_catalogs").select("*,pricing_items(count)").order("name"),
    s.from("pricing_items").select("*").order("catalog_id").order("sort_order").limit(1000),
    s.from("project_statuses").select("*").order("sort_order"),
    s.from("profiles").select("id,display_name,is_active,availability_status").eq("role_code", "field_worker").order("is_active", { ascending: false }).order("display_name"),
    s.from("project_items").select("id,title,status_code,assigned_profile_id,scheduled_start_at,scheduled_due_at,started_at,projects:project_id(id,project_code,title,status_code,scheduled_start_at,scheduled_end_at)").not("assigned_profile_id", "is", null).in("status_code", ["pending", "in_progress"]).limit(1000),
    s.from("project_field_updates").select("project_item_id,worker_profile_id,update_type,requires_attention,created_at").order("created_at", { ascending: false }).limit(1000),
  ]);

  for (const result of [catalogs, pricingItems, projectStages, profiles, assignments, fieldUpdates]) {
    if (result.error) throw result.error;
  }

  const openAssignments = assignments.data ?? [];
  const updates = fieldUpdates.data ?? [];
  const workers = (profiles.data ?? []).map((profile) => {
    const workerItems = openAssignments.filter((item) => item.assigned_profile_id === profile.id);
    const latestUpdate = updates.find((update) => update.worker_profile_id === profile.id && workerItems.some((item) => item.id === update.project_item_id));
    const updatedItem = latestUpdate ? workerItems.find((item) => item.id === latestUpdate.project_item_id) : null;
    const currentItem = latestUpdate && ["on_the_way", "arrived", "in_progress", "issue"].includes(latestUpdate.update_type)
      ? updatedItem
      : workerItems.find((item) => item.status_code === "in_progress");
    const nextItem = workerItems
      .filter((item) => item.status_code === "pending" && item.id !== currentItem?.id)
      .sort((a, b) => {
        if (!a.scheduled_start_at) return 1;
        if (!b.scheduled_start_at) return -1;
        return a.scheduled_start_at.localeCompare(b.scheduled_start_at);
      })[0] ?? null;
    const project = currentItem ? (Array.isArray(currentItem.projects) ? currentItem.projects[0] : currentItem.projects) : null;
    const nextProject = nextItem ? (Array.isArray(nextItem.projects) ? nextItem.projects[0] : nextItem.projects) : null;

    let activityCode = "available";
    let activityLabel = "Available";
    if (!profile.is_active) {
      activityCode = "inactive";
      activityLabel = "Inactive account";
    } else if (currentItem) {
      const updateType = latestUpdate?.project_item_id === currentItem.id ? latestUpdate.update_type : null;
      if (latestUpdate?.requires_attention || updateType === "issue") {
        activityCode = "needs_attention";
        activityLabel = "Needs attention";
      } else if (updateType === "on_the_way") {
        activityCode = "on_the_way";
        activityLabel = "On the way";
      } else if (updateType === "arrived") {
        activityCode = "arrived";
        activityLabel = "On site";
      } else {
        activityCode = "working";
        activityLabel = "Working now";
      }
    } else if (profile.availability_status === "leave") {
      activityCode = "leave";
      activityLabel = "On leave";
    } else if (profile.availability_status === "unavailable") {
      activityCode = "unavailable";
      activityLabel = "Unavailable";
    }

    return {
      id: profile.id,
      displayName: profile.display_name,
      activityCode,
      activityLabel,
      currentItem: currentItem ? { id: currentItem.id, title: currentItem.title, projectId: project?.id ?? null, projectCode: project?.project_code ?? null, projectTitle: project?.title ?? null } : null,
      nextItem: nextItem ? { id: nextItem.id, title: nextItem.title, projectId: nextProject?.id ?? null, projectCode: nextProject?.project_code ?? null, projectTitle: nextProject?.title ?? null, scheduledStartAt: nextItem.scheduled_start_at ?? nextProject?.scheduled_start_at ?? null } : null,
      openItemCount: workerItems.length,
      lastUpdateAt: currentItem && latestUpdate?.project_item_id === currentItem.id ? latestUpdate.created_at : null,
    };
  });

  return { catalogs: catalogs.data ?? [], pricingItems: pricingItems.data ?? [], projectStages: projectStages.data ?? [], workers };
}
export async function saveConfiguration(input:{kind:string;payload:Record<string,unknown>;profileId:string}){const s=createAdminSupabaseClient();let before:unknown=null;let after:unknown=null;if(input.kind==="setting"){const key=String(input.payload.settingKey??"");const old=await s.from("app_settings").select("*").eq("setting_key",key).single();if(old.error)throw old.error;before=old.data;const value=typeof input.payload.value==="string"?JSON.parse(input.payload.value):input.payload.value;const result=await s.from("app_settings").update({value:value as Json,updated_by_profile_id:input.profileId,updated_at:new Date().toISOString()}).eq("setting_key",key).select("*").single();if(result.error)throw result.error;after=result.data;}else if(input.kind==="photo_requirement"){const key=String(input.payload.serviceKey??"");const old=await s.from("service_photo_requirements").select("*").eq("service_key",key).maybeSingle();before=old.data;const result=await s.from("service_photo_requirements").upsert({service_key:key,service_label:String(input.payload.serviceLabel??key),require_customer_photo:Boolean(input.payload.requireCustomerPhoto),require_before:Boolean(input.payload.requireBefore),require_during:Boolean(input.payload.requireDuring),require_after:Boolean(input.payload.requireAfter),minimum_customer_photos:Math.max(0,Number(input.payload.minimumCustomerPhotos)||0),instructions:String(input.payload.instructions??"").trim()||null,updated_by_profile_id:input.profileId,updated_at:new Date().toISOString()}).select("*").single();if(result.error)throw result.error;after=result.data;}else if(input.kind==="project_stage"){const code=String(input.payload.code??"");const old=await s.from("project_statuses").select("*").eq("code",code).single();if(old.error)throw old.error;before=old.data;const result=await s.from("project_statuses").update({label:String(input.payload.label??code),description:String(input.payload.description??"").trim()||null,sort_order:Number(input.payload.sortOrder)||0,is_active:Boolean(input.payload.isActive)}).eq("code",code).select("*").single();if(result.error)throw result.error;after=result.data;}else if(input.kind==="worker_availability"){const id=String(input.payload.profileId??"");const availabilityStatus=String(input.payload.availabilityStatus??"available");if(!["available","limited","unavailable","leave"].includes(availabilityStatus))throw new Error("Choose a valid availability status.");const old=await s.from("profiles").select("*").eq("id",id).eq("role_code","field_worker").eq("is_active",true).single();if(old.error)throw old.error;before=old.data;const result=await s.from("profiles").update({availability_status:availabilityStatus,availability_note:String(input.payload.availabilityNote??"").trim()||null,updated_at:new Date().toISOString()}).eq("id",id).eq("role_code","field_worker").eq("is_active",true).select("*").single();if(result.error)throw result.error;after=result.data;}else throw new Error("Unsupported configuration type.");await logAuditEvent({action:`settings.${input.kind}.update`,entityType:"configuration",entityId:String(input.payload.settingKey??input.payload.serviceKey??input.payload.code??input.payload.profileId??""),performedByProfileId:input.profileId,oldValue:before as Json,newValue:after as Json});return after;}
export async function saveCatalog(input:{id?:string|null;name:string;code:string;serviceDomain:string;currencyCode:string;active:boolean;profileId:string}){const s=createAdminSupabaseClient();const before=input.id?(await s.from("pricing_catalogs").select("*").eq("id",input.id).maybeSingle()).data:null;const payload={name:input.name.trim(),code:input.code.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_"),service_domain:input.serviceDomain.trim(),currency_code:input.currencyCode.trim()||"SGD",is_active:input.active,updated_at:new Date().toISOString()};const result=input.id?await s.from("pricing_catalogs").update(payload).eq("id",input.id).select("*").single():await s.from("pricing_catalogs").insert(payload).select("*").single();if(result.error)throw result.error;await logAuditEvent({action:input.id?"pricing_catalog.update":"pricing_catalog.create",entityType:"pricing_catalog",entityId:result.data.id,performedByProfileId:input.profileId,oldValue:before??undefined,newValue:result.data});return result.data;}
export async function savePricingItem(input:{id?:string|null;catalogId:string;title:string;category?:string|null;description?:string|null;price:number;unit?:string|null;active:boolean;profileId:string}){const s=createAdminSupabaseClient();const before=input.id?(await s.from("pricing_items").select("*").eq("id",input.id).maybeSingle()).data:null;const payload={catalog_id:input.catalogId,service_title:input.title.trim(),category:input.category?.trim()||null,description:input.description?.trim()||null,recommended_price:Math.max(0,input.price),unit_label:input.unit?.trim()||null,is_active:input.active,updated_at:new Date().toISOString()};const result=input.id?await s.from("pricing_items").update(payload).eq("id",input.id).select("*").single():await s.from("pricing_items").insert(payload).select("*").single();if(result.error)throw result.error;await logAuditEvent({action:input.id?"pricing_item.update":"pricing_item.create",entityType:"pricing_item",entityId:result.data.id,performedByProfileId:input.profileId,oldValue:before??undefined,newValue:result.data});return result.data;}
export async function archivePricingItem(id:string,profileId:string){const s=createAdminSupabaseClient();const{data:before,error}=await s.from("pricing_items").select("*").eq("id",id).single();if(error)throw error;const{data,error:updateError}=await s.from("pricing_items").update({is_active:false}).eq("id",id).select("*").single();if(updateError)throw updateError;await logAuditEvent({action:"pricing_item.archive",entityType:"pricing_item",entityId:id,performedByProfileId:profileId,oldValue:before,newValue:data});}
