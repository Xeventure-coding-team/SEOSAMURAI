import { prisma } from "../../../../../lib/prisma";
import { requireAccess } from "../../../../../lib/require-access";


export async function GET() {
    const changelogs = await prisma.changeLog.findMany({
        orderBy: { releaseDate: "desc" },
        select: {
            id: true,
            title: true,
            version: true,
            body: true,
            type: true,
            releaseDate: true,
        },
    });
    return Response.json(changelogs);
}

export async function POST(req: Request) {
    const { error, user } = await requireAccess("access_admin_dashboard");
    if (error) return error;

    const body = await req.json();
    const { title, version, releaseDate } = body;

    const changelog = await prisma.changeLog.create({
        data: {
            title,
            version,
            body: body.body,
            type: body.type ?? null,  
            releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
        },
    });

    return Response.json(changelog, { status: 201 });
}