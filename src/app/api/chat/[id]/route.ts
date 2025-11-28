import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

// export async function DELETE(request: Request, { params }: { params: { id: string } }) {
//   try {
//     await prisma.message.deleteMany({ where: { chatId: params.id } });
//     await prisma.chat.delete({ where: { id: params.id } });
//     return NextResponse.json({ success: true });
//   } catch (error) {
//     return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
//   }
// }

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.message.deleteMany({ where: { chatId: id } });
    await prisma.chat.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete chat error:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
