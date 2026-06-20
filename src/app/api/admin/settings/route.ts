import { prisma } from "../../../../../lib/prisma";
import { requireAccess } from "../../../../../lib/require-access";


export async function GET() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });

  // Return defaults if not yet seeded
  return Response.json(
    settings ?? {
      maintenanceMode: false,
      maintenanceBanner: null,
      registrationOpen: true,
      siteName: null,
      supportEmail: null,
    }
  );
}

export async function PUT(req: Request) {
  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  const body = await req.json();

  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {
      maintenanceMode: body.maintenanceMode,
      maintenanceBanner: body.maintenanceBanner || null,
      registrationOpen: body.registrationOpen,
      siteName: body.siteName || null,
      supportEmail: body.supportEmail || null,
    },
    create: {
      maintenanceMode: body.maintenanceMode ?? false,
      maintenanceBanner: body.maintenanceBanner || null,
      registrationOpen: body.registrationOpen ?? true,
      siteName: body.siteName || null,
      supportEmail: body.supportEmail || null,
    },
  });

  return Response.json(settings);
}