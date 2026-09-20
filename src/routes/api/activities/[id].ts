import { db } from "~/db";
import { activities, hiraItems } from "~/db/schema";
import { eq } from "drizzle-orm";
import type { APIEvent } from "@solidjs/start/server";

// GET /api/activities/:id - Detail satu activity dengan hira items
export async function GET(event: APIEvent) {
  try {
    const id = Number(event.params.id);
    if (isNaN(id)) {
      return Response.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, id));

    if (!activity) {
      return Response.json({ error: "Activity tidak ditemukan" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(hiraItems)
      .where(eq(hiraItems.activityId, id));

    return Response.json({
      success: true,
      data: { activity, items },
    });
  } catch (error) {
    console.error("Get Activity Error:", error);
    return Response.json(
      { error: "Gagal mengambil data activity" },
      { status: 500 }
    );
  }
}

// DELETE /api/activities/:id - Hapus activity (cascade ke hira_items)
export async function DELETE(event: APIEvent) {
  try {
    const id = Number(event.params.id);
    if (isNaN(id)) {
      return Response.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(activities)
      .where(eq(activities.id, id))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Activity tidak ditemukan" }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: `Activity "${deleted.title}" berhasil dihapus`,
    });
  } catch (error) {
    console.error("Delete Activity Error:", error);
    return Response.json(
      { error: "Gagal menghapus activity" },
      { status: 500 }
    );
  }
}
