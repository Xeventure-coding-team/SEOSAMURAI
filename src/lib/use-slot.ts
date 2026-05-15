import useSWR from "swr";

export type SlotResource = "locations" | "websites" | "reviewPosters";

export interface SlotData {
  current:   number;
  limit:     number;
  remaining: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useSlot(slot: SlotResource) {
  const { data, isLoading } = useSWR<SlotData>(
    `/api/slots/${slot}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    data,
    isLoading,
    canAdd: data ? data.remaining > 0 : false,
    remaining: data?.remaining ?? 0
  };
}