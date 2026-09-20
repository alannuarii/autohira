import { db } from "~/db";
import { activities, hiraItems } from "~/db/schema";
import { ilike, or, eq, sql } from "drizzle-orm";
import type { APIEvent } from "@solidjs/start/server";

// GET /api/activities/check?title=... - Cek apakah activity dengan judul serupa sudah ada di database
export async function GET(event: APIEvent) {
  try {
    const url = new URL(event.request.url);
    const title = url.searchParams.get("title");

    if (!title || title.trim().length === 0) {
      return Response.json({ exists: false });
    }

    const cleanTitle = title.trim();

    // Cari aktivitas dengan judul exact match atau yang mengandung kata kunci utama
    // Coba exact / ilike dulu
    const existing = await db
      .select({
        id: activities.id,
        title: activities.title,
        docNumber: activities.docNumber,
        unit: activities.unit,
        location: activities.location,
        supervisor: activities.supervisor,
        createdAt: activities.createdAt,
        updatedAt: activities.updatedAt,
        itemCount: sql<number>`count(${hiraItems.id})::int`,
      })
      .from(activities)
      .leftJoin(hiraItems, eq(hiraItems.activityId, activities.id))
      .where(ilike(activities.title, `%${cleanTitle}%`))
      .groupBy(activities.id)
      .orderBy(sql`${activities.createdAt} DESC`)
      .limit(1);

    if (existing.length === 0) {
      // Coba balikkan: mungkin title yang diinput lebih panjang dari title di db
      const allRecent = await db
        .select({
          id: activities.id,
          title: activities.title,
          docNumber: activities.docNumber,
          unit: activities.unit,
          location: activities.location,
          supervisor: activities.supervisor,
          createdAt: activities.createdAt,
          updatedAt: activities.updatedAt,
          itemCount: sql<number>`count(${hiraItems.id})::int`,
        })
        .from(activities)
        .leftJoin(hiraItems, eq(hiraItems.activityId, activities.id))
        .groupBy(activities.id)
        .orderBy(sql`${activities.createdAt} DESC`)
        .limit(20);

      const match = allRecent.find((a) => {
        const t1 = a.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        const t2 = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
        return t1 && t2 && (t1.includes(t2) || t2.includes(t1));
      });

      if (match) {
        return Response.json({
          exists: true,
          activity: match,
        });
      }

      return Response.json({ exists: false });
    }

    return Response.json({
      exists: true,
      activity: existing[0],
    });
  } catch (error) {
    console.error("Check Activity Error:", error);
    return Response.json({ exists: false, error: "Gagal memeriksa database" });
  }
}
