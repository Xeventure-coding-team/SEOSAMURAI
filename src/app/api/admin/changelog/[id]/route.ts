import { NextRequest } from "next/server";
import { requireAccess } from "../../../../../../lib/require-access";
import { prisma } from "../../../../../../lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  const body = await req.json();
  const { title, version, body: content, type, releaseDate } = body;

  const changelog = await prisma.changeLog.update({
    where: { id: params.id },
    data: {
      title,
      version,
      body: content,
      type: type || null,
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
    },
  });

  return Response.json(changelog);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  await prisma.changeLog.delete({
    where: { id: params.id },
  });

  return Response.json({ success: true });
}