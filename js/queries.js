// Semua fungsi akses data ke Supabase.

window.App = window.App || {};

(function () {
  const PHOTO_BUCKET = "finding-photos";
  const REPORT_BUCKET = "monthly-reports";

  function getClient() {
    if (!window.App.supabase) {
      throw new Error("Client Supabase belum siap. Isi js/config.js terlebih dahulu.");
    }
    return window.App.supabase;
  }

  async function requireSession() {
    const client = getClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session?.user) throw new Error("Anda harus login terlebih dahulu.");
    return data.session.user;
  }

  async function getCurrentProfile() {
    const client = getClient();
    const user = await requireSession();
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    return data || {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email,
      role: "field_staff",
    };
  }

  function normalizeFinding(row) {
    return {
      id: row.id,
      code: row.code,
      foundAt: row.found_at,
      foundDatetime: row.found_datetime,
      areaId: row.area_id,
      areaName: row.areas?.name || "-",
      categoryId: row.category_id,
      categoryName: row.categories?.name || "-",
      description: row.description || "",
      photoDescription: row.photo_description || "",
      companyName: row.company_name || row.department || "-",
      status: row.status,
      resolvedDatetime: row.resolved_datetime,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async function getFindingPhotos(findingId) {
    const client = getClient();
    const { data, error } = await client
      .from("finding_photos")
      .select("id, stage, storage_path, created_at")
      .eq("finding_id", findingId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((photo) => ({
      id: photo.id,
      stage: photo.stage,
      storagePath: photo.storage_path,
      publicUrl: client.storage.from(PHOTO_BUCKET).getPublicUrl(photo.storage_path).data.publicUrl,
      createdAt: photo.created_at,
    }));
  }

  window.App.queries = {
    async getSession() {
      const { data, error } = await getClient().auth.getSession();
      if (error) throw error;
      return data.session;
    },

    async signIn(email, password) {
      const { data, error } = await getClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const { error } = await getClient().auth.signOut();
      if (error) throw error;
    },

    async getCurrentProfile() {
      return getCurrentProfile();
    },

    async getAreas() {
      const { data, error } = await getClient().from("areas").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },

    async getCategories() {
      const { data, error } = await getClient().from("categories").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },

    async getFindings() {
      const client = getClient();
      const { data, error } = await client
        .from("findings")
        .select("*, areas(name), categories(name)")
        .order("found_datetime", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      return Promise.all((data || []).map(async (row) => ({
        ...normalizeFinding(row),
        photos: await getFindingPhotos(row.id),
      })));
    },

    async createFinding(payload) {
      const client = getClient();
      const user = await requireSession();
      const profile = await getCurrentProfile();
      const foundDate = payload.foundDatetime.slice(0, 10);

      const { data, error } = await client
        .from("findings")
        .insert({
          found_at: foundDate,
          found_datetime: payload.foundDatetime,
          area_id: payload.areaId,
          category_id: payload.categoryId,
          description: payload.photoDescription,
          photo_description: payload.photoDescription,
          company_name: profile.full_name,
          department: profile.full_name,
          status: "open",
          created_by: user.id,
        })
        .select("id, code")
        .single();
      if (error) throw error;

      await client.from("activity_log").insert({
        finding_id: data.id,
        actor_id: user.id,
        action: "created",
        detail: `Temuan ${data.code} dibuat`,
      });
      return data;
    },

    async submitProgressUpdate(findingId, payload) {
      const client = getClient();
      const user = await requireSession();

      const { data, error } = await client
        .from("findings")
        .update({
          status: "progress",
          resolved_datetime: payload.resolvedDatetime,
        })
        .eq("id", findingId)
        .eq("created_by", user.id)
        .eq("status", "open")
        .select("id, code")
        .single();
      if (error) throw error;

      await client.from("activity_log").insert({
        finding_id: findingId,
        actor_id: user.id,
        action: "status_changed",
        detail: "Status diubah menjadi progress (menunggu approval admin)",
      });
      return data;
    },

    async approveFinding(findingId) {
      const client = getClient();
      const profile = await getCurrentProfile();
      if (profile.role !== "admin") throw new Error("Hanya admin yang dapat menyetujui temuan.");

      const { data, error } = await client
        .from("findings")
        .update({ status: "closed" })
        .eq("id", findingId)
        .eq("status", "progress")
        .select("id, code")
        .single();
      if (error) throw error;

      await client.from("activity_log").insert({
        finding_id: findingId,
        actor_id: profile.id,
        action: "status_changed",
        detail: "Disetujui admin — status closed",
      });
      return data;
    },

    async uploadFindingPhoto(findingId, blob, stage) {
      const client = getClient();
      const profile = await getCurrentProfile();
      const fileName = `${findingId}/${stage}-${Date.now()}.webp`;

      const { error: uploadError } = await client.storage
        .from(PHOTO_BUCKET)
        .upload(fileName, blob, { contentType: "image/webp", upsert: false });
      if (uploadError) throw uploadError;

      const { data, error } = await client
        .from("finding_photos")
        .insert({
          finding_id: findingId,
          stage,
          storage_path: fileName,
          uploaded_by: profile.id,
        })
        .select("id")
        .single();
      if (error) throw error;

      await client.from("activity_log").insert({
        finding_id: findingId,
        actor_id: profile.id,
        action: "photo_uploaded",
        detail: `Foto ${stage} diunggah`,
      });
      return data;
    },

    async uploadMonthlyReport(blob, fileName, reportMonth, companyName) {
      const client = getClient();
      const profile = await getCurrentProfile();
      const storagePath = `${profile.id}/${reportMonth}-${Date.now()}-${fileName}`;

      const { error: uploadError } = await client.storage
        .from(REPORT_BUCKET)
        .upload(storagePath, blob, {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data, error } = await client
        .from("monthly_reports")
        .insert({
          uploaded_by: profile.id,
          company_name: companyName,
          report_month: reportMonth,
          storage_path: storagePath,
          file_name: fileName,
        })
        .select("id, report_month, file_name, created_at")
        .single();
      if (error) throw error;
      return data;
    },

    async getMonthlyReports() {
      const { data, error } = await getClient()
        .from("monthly_reports")
        .select("id, company_name, report_month, file_name, created_at")
        .order("report_month", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  };
})();
