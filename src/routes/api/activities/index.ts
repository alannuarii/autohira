import { db } from "~/db";
import { activities, hiraItems } from "~/db/schema";
import { desc, eq } from "drizzle-orm";
import type { APIEvent } from "@solidjs/start/server";

// GET /api/activities - Daftar semua activities
export async function GET() {
  try {
    const result = await db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt));

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error("List Activities Error:", error);
    return Response.json(
      { error: "Gagal mengambil data activities" },
      { status: 500 }
    );
  }
}

// POST /api/activities - Simpan activity + hira items ke database
export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { activity, items } = body;

    if (!activity || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: "Data activity dan items wajib diisi" },
        { status: 400 }
      );
    }

    let targetActivity = null;

    if (activity.id) {
      // Perbarui activity yang sudah ada
      const [updated] = await db
        .update(activities)
        .set({
          title: activity.title,
          docNumber: activity.docNumber || null,
          unit: activity.unit,
          location: activity.location,
          supervisor: activity.supervisor,
          updatedAt: new Date(),
        })
        .where(eq(activities.id, activity.id))
        .returning();

      if (updated) {
        targetActivity = updated;
        // Hapus item-item lama untuk diganti dengan hasil baru
        await db.delete(hiraItems).where(eq(hiraItems.activityId, updated.id));
      }
    }

    if (!targetActivity) {
      // 1. Insert activity header baru
      const [newActivity] = await db
        .insert(activities)
        .values({
          title: activity.title,
          docNumber: activity.docNumber || null,
          unit: activity.unit,
          location: activity.location,
          supervisor: activity.supervisor,
        })
        .returning();
      targetActivity = newActivity;
    }

    // 2. Insert all hira items
    const hiraValues = items.map((item: any) => ({
      activityId: targetActivity.id,
      subActivity: item.subActivity,
      k3Category: item.k3Category,
      condition: item.condition,
      hazard: item.hazard,
      regulations: item.regulations || null,
      impact: item.impact,
      likelihoodP: item.likelihoodP,
      severityDl: item.severityDl,
      severitySl: item.severitySl,
      severityCm: item.severityCm,
      severityAs: item.severityAs,
      maxSeverity: item.maxSeverity,
      initialRiskScore: item.initialRiskScore,
      isSignificant: item.isSignificant,
      existingControl: item.existingControl,
      ecmFactor: item.ecmFactor,
      residualRiskScore: item.residualRiskScore,
      riskCategory: item.riskCategory,
      determiningControl: item.determiningControl,
      managementResponseCode: item.managementResponseCode || null,
      managementResponseAction: item.managementResponseAction || null,
    }));

    const insertedItems = await db
      .insert(hiraItems)
      .values(hiraValues)
      .returning();

    return Response.json({
      success: true,
      data: {
        activity: targetActivity,
        items: insertedItems,
      },
    });
  } catch (error) {
    console.error("Save Activity Error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return Response.json(
      { error: `Gagal menyimpan data: ${message}` },
      { status: 500 }
    );
  }
}
