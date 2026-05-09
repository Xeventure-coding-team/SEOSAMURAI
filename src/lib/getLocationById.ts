import { prisma } from "../../lib/prisma"


export interface LocationRecord {
  id: string
  location_id: string        // GMB "locations/xxx"
  location_name: string
  is_active: boolean
  is_deleted: boolean
  categories: string | null
  website: string | null
  created_at: Date
  updated_at: Date
}

/**
 * Fetch a location record by MongoDB _id.
 * Use this everywhere instead of filtering by location_id + user_id.
 *
 * @param mongoId - The MongoDB _id (e.g. "6957558952443dff1f735a6a")
 * @returns LocationRecord or null if not found
 */
export async function getLocationById(mongoId: string): Promise<LocationRecord | null> {
  if (!mongoId) return null

  const location = await prisma.locations.findUnique({
    where: { id: mongoId },
    select: {
      id: true,
      location_id: true,
      location_name: true,
      is_active: true,
      is_deleted: true,
      categories: true,
      website: true,
      created_at: true,
      updated_at: true,
    },
  })

  return location
}

/**
 * Strips the "locations/" prefix from a GMB location ID.
 * e.g. "locations/123456" → "123456"
 */
export function cleanGmbLocationId(locationId: string): string {
  return locationId.replace(/^locations\//, "")
}

/**
 * Strips the "accounts/" prefix from a GMB account ID.
 * e.g. "accounts/112695130866440932097" → "112695130866440932097"
 */
export function cleanGmbAccountId(accountId: string): string {
  return accountId.replace(/^accounts\//, "")
}